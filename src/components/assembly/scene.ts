import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { parts, steps, type Focus, type Part, type Vec, type View } from '@/components/assembly/steps'

const modelUrl = '/models/zlynka-assembly.glb'
const transitionMs = 1100
const highlight = new THREE.Color('#ffcc00')

const plywood = '#dcbc8f'
const colors: Record<string, string> = {
  b04: '#d8b685', // front frame, a shade darker so the glued parts stand out
  b05: '#d8b685',
  b06: '#cdab7c', // back cover
}

type Body = {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  part: Part
  home: THREE.Vector3
  /** Centre x of the body: which side a shutter or a post goes to */
  side: number
}

type Pose = { offset: THREE.Vector3; opacity: number }

const vec = ([x, y, z]: Vec) => new THREE.Vector3(x, y, z)

function poseAt(body: Body, step: number): Pose {
  let { part } = body
  let offset = part.group && step < part.group.joins ? vec(part.group.offset(body.side)) : new THREE.Vector3()
  if (step >= part.appears) return { offset, opacity: 1 }
  // Not there yet: waits where it will fly in from, invisible
  let next = part.group && part.appears < part.group.joins ? vec(part.group.offset(body.side)) : new THREE.Vector3()
  return { offset: next.add(vec(part.from)), opacity: 0 }
}

/** Parts that move at this step: they come in or join the frame */
const movesAt = (part: Part, step: number) => part.appears === step || part.group?.joins === step

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/** Azimuth of the camera around the nalichnik: three quarters from the front or from the back */
const azimuths: Record<View, number> = { front: 0.38, back: Math.PI - 0.5 }

/** Where the camera looks: the whole nalichnik, or close up at the crown put together above it */
const shots: Record<Focus, { target: THREE.Vector3; radius: number }> = {
  all: { target: new THREE.Vector3(0, 0.6, 0), radius: 2.55 },
  crown: { target: new THREE.Vector3(0, 1.22, 0.12), radius: 1.45 },
}

type CameraMove = {
  target: [THREE.Vector3, THREE.Vector3]
  radius: [number, number]
  theta: [number, number]
  start: number
}

export type AssemblyScene = {
  goTo: (step: number) => void
  dispose: () => void
}

export function createAssemblyScene(
  container: HTMLElement,
  { onLoad, onError }: { onLoad: () => void; onError: () => void },
): AssemblyScene {
  let renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'block size-full touch-none'
  container.prepend(renderer.domElement)

  let scene = new THREE.Scene()
  scene.background = new THREE.Color('#e4e0d9')
  let pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.6

  let camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50)
  camera.position.setFromSphericalCoords(shots.all.radius, 1.33, azimuths.front).add(shots.all.target)
  let controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(shots.all.target)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 1.2
  controls.maxDistance = 4.5
  controls.minPolarAngle = 0.6
  controls.maxPolarAngle = 1.75

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.8))
  let sun = new THREE.DirectionalLight(0xfff4e0, 2.2)
  sun.position.set(-1.5, 3, 2.5)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -1.2, right: 1.2, top: 1.6, bottom: -0.6, near: 0.5, far: 8 })
  sun.shadow.bias = -0.0003
  sun.shadow.normalBias = 0.002
  sun.shadow.radius = 4
  scene.add(sun)
  let back = new THREE.DirectionalLight(0xffffff, 1.4)
  back.position.set(1, 1.5, -2.5)
  scene.add(back)

  // Floor that only shows shadows
  let floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.12 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.002
  floor.receiveShadow = true
  scene.add(floor)

  let bodies: Body[] = []
  let current = 0
  let disposed = false
  let animation: { from: number; to: number; start: number } | null = null
  let cameraMove: CameraMove | null = null

  let draco = new DRACOLoader().setDecoderPath('/draco/').setDecoderConfig({ type: 'wasm' })
  new GLTFLoader().setDRACOLoader(draco).load(
    modelUrl,
    (gltf) => {
      if (disposed) return
      let byName = new Map<string, Part>()
      for (let part of parts) for (let name of part.bodies) byName.set(name, part)
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        let name = object.name || object.parent?.name || ''
        let part = byName.get(name)
        if (!part) return
        object.geometry = toCreasedNormals(object.geometry, THREE.MathUtils.degToRad(35))
        object.material =
          name === 'b28'
            ? new THREE.MeshStandardMaterial({ color: '#dfe7ec', metalness: 1, roughness: 0.04 })
            : new THREE.MeshStandardMaterial({ color: colors[name] ?? plywood, roughness: 0.72 })
        object.castShadow = object.receiveShadow = true
        let box = new THREE.Box3().setFromObject(object)
        bodies.push({
          mesh: object as Body['mesh'],
          part,
          home: object.position.clone(),
          side: (box.min.x + box.max.x) / 2,
        })
      })
      scene.add(gltf.scene)
      apply(current, current, 1)
      onLoad()
    },
    undefined,
    () => !disposed && onError(),
  )

  /** Poses between two steps, `t` from 0 to 1 */
  function apply(from: number, to: number, t: number) {
    let k = ease(t)
    let glow = to > from && t < 1 ? Math.sin(Math.min(1, t * 1.6) * Math.PI) : 0
    for (let body of bodies) {
      let a = poseAt(body, from)
      let b = poseAt(body, to)
      body.mesh.position.copy(body.home).add(a.offset.lerp(b.offset, k))
      let opacity = a.opacity + (b.opacity - a.opacity) * Math.min(1, k * 1.8)
      let material = body.mesh.material
      material.opacity = opacity
      material.transparent = opacity < 1
      body.mesh.visible = opacity > 0.01
      body.mesh.castShadow = opacity > 0.5
      // The parts of this step light up yellow for a moment
      let lit = to > from && movesAt(body.part, to) ? glow * 0.45 : 0
      material.emissive.copy(highlight).multiplyScalar(lit)
    }
  }

  function goTo(step: number) {
    let to = Math.max(0, Math.min(steps.length - 1, step))
    if (to === current && !animation) return
    let from = animation ? animation.to : current
    if (animation) apply(animation.from, animation.to, 1)
    animation = { from, to, start: performance.now() }
    current = to
    // The finished nalichnik slowly turns on its own
    controls.autoRotate = to === steps.length - 1
    controls.autoRotateSpeed = 0.8
    // The camera flies to what is put together at this step, and turns
    // round when the step is seen better from the back
    let shot = shots[steps[to].focus ?? 'all']
    let spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target))
    let delta = ((azimuths[steps[to].view ?? 'front'] - spherical.theta + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    cameraMove = {
      target: [controls.target.clone(), shot.target],
      radius: [spherical.radius, shot.radius],
      // A small turn made by hand stays
      theta: [spherical.theta, spherical.theta + (Math.abs(delta) > 0.6 ? delta : 0)],
      start: performance.now(),
    }
  }

  function resize() {
    let { clientWidth: w, clientHeight: h } = container
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // On a narrow view the camera moves back, so the shutters and the crown fit
    camera.zoom = Math.min(1, w / h / 1.35)
    camera.updateProjectionMatrix()
  }
  let observer = new ResizeObserver(resize)
  observer.observe(container)

  renderer.setAnimationLoop((now) => {
    if (animation) {
      let t = Math.min(1, (now - animation.start) / transitionMs)
      apply(animation.from, animation.to, t)
      if (t === 1) animation = null
    }
    if (cameraMove) {
      let k = ease(Math.min(1, (now - cameraMove.start) / 1400))
      let spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target))
      spherical.radius = cameraMove.radius[0] + (cameraMove.radius[1] - cameraMove.radius[0]) * k
      spherical.theta = cameraMove.theta[0] + (cameraMove.theta[1] - cameraMove.theta[0]) * k
      controls.target.lerpVectors(cameraMove.target[0], cameraMove.target[1], k)
      camera.position.setFromSpherical(spherical).add(controls.target)
      if (k === 1) cameraMove = null
    }
    controls.update()
    renderer.render(scene, camera)
  })

  return {
    goTo,
    dispose() {
      disposed = true
      observer.disconnect()
      renderer.setAnimationLoop(null)
      controls.dispose()
      draco.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
