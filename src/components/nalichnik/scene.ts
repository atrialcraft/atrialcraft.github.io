import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { type Colors, type WallId, type ZoneId } from '@/components/nalichnik/palette'

const modelUrl = '/models/nalichnik-1.glb'
const wallWidth = 6
const wallHeight = 4

function random(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647
}

function shade(hex: string, k: number) {
  let c = new THREE.Color(`#${hex}`)
  c.offsetHSL(0, 0, k)
  return `#${c.getHexString()}`
}

/** Wall texture, drawn in the wall colour; one tile covers `tile` model units (the nalichnik is 1 high) */
function drawWall(texture: THREE.CanvasTexture, material: THREE.MeshStandardMaterial, type: WallId, hex: string) {
  let canvas = texture.image as HTMLCanvasElement
  let S = 1024
  canvas.width = canvas.height = S
  let g = canvas.getContext('2d')!
  let r = random(7)
  let tile: number
  g.fillStyle = `#${hex}`
  g.fillRect(0, 0, S, S)

  if (type === 'log' || type === 'beam' || type === 'board') {
    let rows = type === 'log' ? 5 : type === 'beam' ? 6 : 12
    tile = type === 'log' ? 0.7 : type === 'beam' ? 0.75 : 0.6
    let h = S / rows
    for (let i = 0; i < rows; i++) {
      let y = i * h
      let gradient = g.createLinearGradient(0, y, 0, y + h)
      if (type === 'log') {
        gradient.addColorStop(0, shade(hex, -0.16))
        gradient.addColorStop(0.15, shade(hex, -0.03))
        gradient.addColorStop(0.4, shade(hex, 0.05))
        gradient.addColorStop(0.8, shade(hex, -0.04))
        gradient.addColorStop(1, shade(hex, -0.18))
      } else {
        let v = (r() - 0.5) * 0.05
        gradient.addColorStop(0, shade(hex, type === 'board' ? 0.06 + v : v))
        gradient.addColorStop(0.85, shade(hex, -0.02 + v))
        gradient.addColorStop(1, shade(hex, -0.12 + v))
      }
      g.fillStyle = gradient
      g.fillRect(0, y, S, h)
      // Grain
      g.globalAlpha = 0.07
      for (let k = 0; k < (type === 'board' ? 6 : 14); k++) {
        g.strokeStyle = r() > 0.5 ? shade(hex, -0.25) : shade(hex, 0.15)
        g.lineWidth = 1 + r() * 2
        let yy = y + h * (0.15 + r() * 0.7)
        g.beginPath()
        g.moveTo(0, yy)
        for (let x = 0; x <= S; x += 64) g.lineTo(x, yy + Math.sin(x / 90 + k) * 2 + (r() - 0.5) * 2)
        g.stroke()
      }
      g.globalAlpha = 1
      // Seam
      g.fillStyle = shade(hex, -0.3)
      g.fillRect(0, y + h - 2, S, 2)
    }
  } else if (type === 'brick') {
    tile = 0.55
    let rows = 16
    let cols = 4
    let h = S / rows
    let w = S / cols
    let m = 7
    g.fillStyle = '#cfc8bb'
    g.fillRect(0, 0, S, S)
    for (let i = 0; i < rows; i++) {
      let offset = i % 2 ? w / 2 : 0
      for (let j = -1; j < cols + 1; j++) {
        g.fillStyle = shade(hex, (r() - 0.5) * 0.1)
        g.fillRect(j * w + offset + m / 2, i * h + m / 2, w - m, h - m)
      }
    }
  } else {
    tile = 0.5
    for (let k = 0; k < 9000; k++) {
      g.fillStyle = r() > 0.5 ? shade(hex, -0.05) : shade(hex, 0.04)
      g.globalAlpha = 0.5
      g.fillRect(r() * S, r() * S, 2 + r() * 3, 2 + r() * 3)
    }
    g.globalAlpha = 1
  }
  texture.repeat.set(wallWidth / tile, wallHeight / tile)
  texture.needsUpdate = true
  material.bumpScale = type === 'plaster' ? 1 : 3
}

export type NalichnikScene = {
  setColors: (colors: Colors) => void
  setWall: (type: WallId, hex: string) => void
  flash: (id: ZoneId) => void
  snapshot: () => Promise<Blob | null>
  dispose: () => void
}

/**
 * The nalichnik on a wall, which can be turned with the mouse or a finger.
 * `onPick` gets a part clicked on the model, `onHover` the part under the mouse.
 */
export function createScene(
  container: HTMLElement,
  {
    onLoad,
    onError,
    onPick,
    onHover,
  }: {
    onLoad: () => void
    onError: () => void
    onPick: (id: ZoneId) => void
    onHover: (id: ZoneId | null, x: number, y: number) => void
  },
): NalichnikScene {
  let renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'block size-full touch-none'
  container.prepend(renderer.domElement)

  let scene = new THREE.Scene()
  scene.background = new THREE.Color(0xcfd8de)
  let pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.55

  let camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50)
  camera.position.set(0.35, 0.62, 2.3)
  let controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.5, 0)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 0.6
  controls.maxDistance = 3.2
  controls.minAzimuthAngle = -1.1
  controls.maxAzimuthAngle = 1.1
  controls.minPolarAngle = 0.9
  controls.maxPolarAngle = 2.0

  scene.add(new THREE.HemisphereLight(0xeef3ff, 0x8a7a66, 0.9))
  let sun = new THREE.DirectionalLight(0xfff4e0, 2.4)
  sun.position.set(-1.2, 2.2, 2.0)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -0.9, right: 0.9, top: 1.2, bottom: -0.3, near: 0.5, far: 6 })
  sun.shadow.bias = -0.0002
  sun.shadow.normalBias = 0.0015
  sun.shadow.radius = 3
  scene.add(sun)

  let wallTexture = new THREE.CanvasTexture(document.createElement('canvas'))
  wallTexture.colorSpace = THREE.SRGBColorSpace
  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping
  wallTexture.anisotropy = 8
  let wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, bumpMap: wallTexture, bumpScale: 2, roughness: 0.9 })
  let wall = new THREE.Mesh(new THREE.PlaneGeometry(wallWidth, wallHeight), wallMaterial)
  wall.receiveShadow = true
  scene.add(wall)

  let meshes: Partial<Record<ZoneId, THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>> = {}
  let pendingColors: Colors | null = null
  let disposed = false

  let draco = new DRACOLoader().setDecoderPath('/draco/').setDecoderConfig({ type: 'wasm' })
  new GLTFLoader().setDRACOLoader(draco).load(
    modelUrl,
    (gltf) => {
      if (disposed) return
      let root = gltf.scene
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry = toCreasedNormals(object.geometry, THREE.MathUtils.degToRad(35))
        let id = object.name || object.parent?.name
        if (id === 'okno') {
          object.material = new THREE.MeshStandardMaterial({ color: 0x46596a, roughness: 0.06, metalness: 0.35 })
        } else {
          object.material = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 })
          object.userData.zone = id
          meshes[id as ZoneId] = object
        }
        object.castShadow = object.receiveShadow = true
      })
      scene.add(root)
      let box = new THREE.Box3().setFromObject(root)
      wall.position.set(0, 0.5, box.min.z - 0.002)
      if (pendingColors) setColors(pendingColors)
      onLoad()
    },
    undefined,
    () => !disposed && onError(),
  )

  function setColors(colors: Colors) {
    pendingColors = colors
    for (let [id, hex] of Object.entries(colors)) meshes[id as ZoneId]?.material.color.set(`#${hex}`)
  }

  // Picking a part on the model
  let ray = new THREE.Raycaster()
  let pointer = new THREE.Vector2()
  let hovered: ZoneId | null = null
  let down: [number, number] | null = null

  function pick(event: PointerEvent): ZoneId | null {
    let rect = renderer.domElement.getBoundingClientRect()
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    ray.setFromCamera(pointer, camera)
    return (ray.intersectObjects(scene.children, true)[0]?.object.userData.zone as ZoneId) ?? null
  }

  function setHover(id: ZoneId | null) {
    if (hovered === id) return
    if (hovered) meshes[hovered]?.material.emissive.setHex(0)
    hovered = id
    if (id) meshes[id]?.material.emissive.setHex(0x1a1a1a)
    renderer.domElement.style.cursor = id ? 'pointer' : ''
  }

  let canvas = renderer.domElement
  let onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || event.buttons) {
      setHover(null)
      onHover(null, 0, 0)
      return
    }
    let id = pick(event)
    setHover(id)
    let rect = container.getBoundingClientRect()
    onHover(id, event.clientX - rect.left, event.clientY - rect.top)
  }
  let onLeave = () => {
    setHover(null)
    onHover(null, 0, 0)
  }
  let onDown = (event: PointerEvent) => (down = [event.clientX, event.clientY])
  let onUp = (event: PointerEvent) => {
    if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) return
    let id = pick(event)
    if (id) {
      flash(id)
      onPick(id)
    }
  }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)

  function flash(id: ZoneId) {
    let material = meshes[id]?.material
    if (!material) return
    let start = performance.now()
    let step = (t: number) => {
      let k = Math.max(0, 1 - (t - start) / 700)
      material.emissive.setScalar(0.35 * Math.sin(k * Math.PI))
      if (k > 0) requestAnimationFrame(step)
      else material.emissive.setHex(hovered === id ? 0x1a1a1a : 0)
    }
    requestAnimationFrame(step)
  }

  function resize() {
    let { clientWidth: w, clientHeight: h } = container
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // On a narrow view the camera moves back, so the shutters fit
    camera.zoom = Math.min(1, w / h)
    camera.updateProjectionMatrix()
  }
  let observer = new ResizeObserver(resize)
  observer.observe(container)
  renderer.setAnimationLoop(() => {
    controls.update()
    renderer.render(scene, camera)
  })

  return {
    setColors,
    setWall: (type, hex) => drawWall(wallTexture, wallMaterial, type, hex),
    flash,
    snapshot: () =>
      new Promise((resolve) => {
        renderer.render(scene, camera)
        renderer.domElement.toBlob(resolve)
      }),
    dispose() {
      disposed = true
      observer.disconnect()
      renderer.setAnimationLoop(null)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      controls.dispose()
      draco.dispose()
      pmrem.dispose()
      wallTexture.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
