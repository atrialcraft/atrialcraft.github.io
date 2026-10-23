'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import type { Design, Net, PlateFace, Point } from '@/components/boxes/geometry'

const deg = Math.PI / 180
const progress = (t: number, [a, b]: [number, number]) =>
  Math.min(1, Math.max(0, (t - a) / (b - a)))

type Built = {
  group: THREE.Group
  /** Sets the folding state: 0 — flat, 1 — assembled */
  update: (t: number) => void
  dispose: () => void
}

function material(color: string, transparent: boolean) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent,
    opacity: transparent ? 0.55 : 1,
  })
}

/** A flat piece of material from an outline: extruded by its thickness */
function slab(points: Point[], thickness: number, mat: THREE.Material, edgeColor: string) {
  let shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
  let geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
  let mesh = new THREE.Mesh(geometry, mat)
  let edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 25),
    new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.45 }),
  )
  let holder = new THREE.Group()
  holder.add(mesh, edges)
  holder.matrixAutoUpdate = false
  return holder
}

/** Matrix that turns everything around the line through a → b by `angle` */
function hingeMatrix(a: THREE.Vector3, b: THREE.Vector3, angle: number) {
  let axis = b.clone().sub(a).normalize()
  return new THREE.Matrix4()
    .makeTranslation(a.x, a.y, a.z)
    .multiply(new THREE.Matrix4().makeRotationAxis(axis, angle))
    .multiply(new THREE.Matrix4().makeTranslation(-a.x, -a.y, -a.z))
}

// Dieline y goes down, 3D y goes up
const v3 = ([x, y]: Point) => new THREE.Vector3(x, -y, 0)

function buildNet(net: Net, thickness: number, mat: THREE.Material, edgeColor: string) {
  let group = new THREE.Group()
  let holders = net.panels.map((panel) => {
    let holder = slab(panel.poly.map(([x, y]) => [x, -y]), thickness, mat, edgeColor)
    group.add(holder)
    return holder
  })
  // Every fold goes toward the same side of the sheet (+z), the inside of the box
  let signs = net.panels.map((panel) => {
    if (!panel.hinge) return 0
    let a = v3(panel.hinge[0])
    let u = v3(panel.hinge[1]).sub(a).normalize()
    let centre = panel.poly
      .reduce((sum, p) => sum.add(v3(p)), new THREE.Vector3())
      .divideScalar(panel.poly.length)
      .sub(a)
    return u.cross(centre).z > 0 ? 1 : -1
  })
  let placement = (t: number) => {
    if (net.lid) {
      let { lift, boxHeight, boxCenter, center } = net.lid
      let down = progress(t, [0.85, 1])
      return new THREE.Matrix4()
        .makeTranslation(
          boxCenter[0] - center[0],
          boxHeight + thickness + lift * (1 - down),
          boxCenter[1] + center[1],
        )
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
    }
    return net.base === 'lying'
      ? new THREE.Matrix4().makeRotationX(-Math.PI / 2)
      : new THREE.Matrix4()
  }
  let update = (t: number) => {
    let matrices: THREE.Matrix4[] = []
    net.panels.forEach((panel, i) => {
      let m =
        panel.parent === undefined ? placement(t) : matrices[panel.parent].clone()
      if (panel.hinge) {
        let angle = signs[i] * (panel.angle ?? 90) * deg * progress(t, panel.stage ?? [0, 1])
        m.multiply(hingeMatrix(v3(panel.hinge[0]), v3(panel.hinge[1]), angle))
      }
      matrices[i] = m
      holders[i].matrix.copy(m)
      holders[i].matrixWorldNeedsUpdate = true
    })
  }
  return { group, update }
}

/**
 * Laser box plates: drawn where they stand in the assembled box, the walls
 * fold down around the bottom and the lid opens on the back
 */
function buildPlates(design: Design, mat: THREE.Material, edgeColor: string) {
  if (design.model.kind !== 'plates') throw new Error('not plates')
  let { plates, size, thickness: t } = design.model
  let [X, Y, Z] = size // length, width, height of the box
  let group = new THREE.Group()
  // World: x — length, y — up, z — width. Shape: (u, -v), extruded along w
  let assembled: Record<PlateFace, THREE.Matrix4> = {
    bottom: new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1),
    top: new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, Z - t, 0, -1, 0, 0, 0, 0, 0, 1),
    front: new THREE.Matrix4().set(1, 0, 0, 0, 0, 1, 0, Z, 0, 0, 1, 0, 0, 0, 0, 1),
    back: new THREE.Matrix4().set(1, 0, 0, 0, 0, 1, 0, Z, 0, 0, 1, Y - t, 0, 0, 0, 1),
    left: new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, Z, 1, 0, 0, 0, 0, 0, 0, 1),
    right: new THREE.Matrix4().set(0, 0, 1, X - t, 0, 1, 0, Z, 1, 0, 0, 0, 0, 0, 0, 1),
  }
  let holders = plates.map((plate) => {
    let holder = slab(plate.outline.map(([u, v]) => [u, -v]), t, mat, edgeColor)
    group.add(holder)
    return { holder, face: plate.face }
  })
  let line = (a: [number, number, number], b: [number, number, number]) =>
    [new THREE.Vector3(...a), new THREE.Vector3(...b)] as const
  let update = (t01: number) => {
    let walls = 1 - progress(t01, [0, 0.6])
    let lid = 1 - progress(t01, [0.6, 1])
    let fold: Record<Exclude<PlateFace, 'top'>, THREE.Matrix4> = {
      bottom: new THREE.Matrix4(),
      front: hingeMatrix(...line([0, 0, 0], [1, 0, 0]), -walls * 90 * deg),
      back: hingeMatrix(...line([0, 0, Y], [1, 0, Y]), walls * 90 * deg),
      left: hingeMatrix(...line([0, 0, 0], [0, 0, 1]), walls * 90 * deg),
      right: hingeMatrix(...line([X, 0, 0], [X, 0, 1]), -walls * 90 * deg),
    }
    for (let { holder, face } of holders) {
      let m =
        face === 'top'
          ? fold.back
              .clone()
              .multiply(hingeMatrix(...line([0, Z, Y], [1, Z, Y]), lid * 90 * deg))
          : fold[face].clone()
      holder.matrix.copy(m.multiply(assembled[face]))
      holder.matrixWorldNeedsUpdate = true
    }
  }
  return { group, update }
}

function build(design: Design, color: string, transparent: boolean): Built {
  let mat = material(color, transparent)
  let edgeColor = '#3a2a18'
  let root = new THREE.Group()
  let parts =
    design.model.kind === 'plates'
      ? [buildPlates(design, mat, edgeColor)]
      : design.model.nets.map((net) =>
          buildNet(net, (design.model as { thickness: number }).thickness, mat, edgeColor),
        )
  for (let part of parts) root.add(part.group)
  let update = (t: number) => {
    for (let part of parts) part.update(t)
    root.updateMatrixWorld(true)
  }
  let dispose = () =>
    root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose()
      }
    })
  return { group: root, update, dispose }
}

function lights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a8a8a', 2.2))
  let sun = new THREE.DirectionalLight('#ffffff', 1.6)
  sun.position.set(1, 2, 1.5)
  scene.add(sun)
}

/** Centre and size of the model when assembled and when flat */
function frame(built: Built) {
  let box = new THREE.Box3()
  built.update(1)
  let assembled = new THREE.Box3().setFromObject(built.group)
  built.update(0)
  box.copy(assembled).union(new THREE.Box3().setFromObject(built.group))
  let centre = assembled.getCenter(new THREE.Vector3())
  return { centre, radius: assembled.getSize(new THREE.Vector3()).length() / 2, flat: box.getSize(new THREE.Vector3()).length() / 2 }
}

export function Box3D({
  design,
  color,
  transparent = false,
  t,
}: {
  design: Design
  color: string
  transparent?: boolean
  t: number
}) {
  let mount = useRef<HTMLDivElement>(null)
  let state = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    built?: Built
    t: number
  } | null>(null)

  // Renderer, camera and controls live as long as the component
  useEffect(() => {
    let element = mount.current!
    let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    element.appendChild(renderer.domElement)
    let scene = new THREE.Scene()
    lights(scene)
    let camera = new THREE.PerspectiveCamera(35, 1, 1, 20000)
    let controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    state.current = { renderer, scene, camera, controls, t }

    let resize = () => {
      let { clientWidth: w, clientHeight: h } = element
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    let observer = new ResizeObserver(resize)
    observer.observe(element)

    let frameId = 0
    let loop = () => {
      controls.update()
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      controls.dispose()
      state.current?.built?.dispose()
      renderer.dispose()
      element.removeChild(renderer.domElement)
      state.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A new model when the design or the material changes
  useEffect(() => {
    let s = state.current
    if (!s) return
    if (s.built) {
      s.scene.remove(s.built.group)
      s.built.dispose()
    }
    let built = build(design, color, transparent)
    let { centre, radius, flat } = frame(built)
    built.group.position.copy(centre.negate())
    s.scene.add(built.group)
    s.built = built
    built.update(s.t)
    let distance = Math.max(radius * 3.2, flat * 1.6)
    s.camera.position.set(distance * 0.55, distance * 0.5, distance * 0.67)
    s.controls.target.set(0, 0, 0)
    s.controls.update()
  }, [design, color, transparent])

  useEffect(() => {
    let s = state.current
    if (!s) return
    s.t = t
    s.built?.update(t)
  }, [t])

  return <div ref={mount} className="size-full cursor-grab active:cursor-grabbing" />
}

// One small renderer shared by all thumbnails
let thumbRenderer: THREE.WebGLRenderer | null = null

/** A picture of the assembled box for the model gallery */
export function renderThumbnail(design: Design, color: string, transparent = false) {
  if (!thumbRenderer) {
    thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    thumbRenderer.setPixelRatio(2)
    thumbRenderer.setSize(200, 150)
  }
  let scene = new THREE.Scene()
  lights(scene)
  let built = build(design, color, transparent)
  let { centre, radius } = frame(built)
  built.update(1)
  built.group.position.copy(centre.negate())
  scene.add(built.group)
  let camera = new THREE.PerspectiveCamera(35, 200 / 150, 1, 20000)
  let distance = radius * 3
  camera.position.set(distance * 0.55, distance * 0.5, distance * 0.67)
  camera.lookAt(0, 0, 0)
  thumbRenderer.render(scene, camera)
  let url = thumbRenderer.domElement.toDataURL('image/png')
  built.dispose()
  return url
}
