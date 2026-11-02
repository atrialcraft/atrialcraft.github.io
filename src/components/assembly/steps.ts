// Assembly of the «Злынка» nalichnik, step by step as in the instruction
// (src/app/instructions/zlynka). The model public/models/zlynka-assembly.glb
// has one mesh per body of the Kompas STEP, named b00…b28

export type Vec = [number, number, number]

/**
 * A group of bodies that is put together away from the frame and then
 * joins it: until `joins` it stays shifted by `offset`
 */
type Group = { offset: (x: number) => Vec; joins: number }

export type Part = {
  bodies: string[]
  /** Step where the part comes in */
  appears: number
  /** Where it flies in from, relative to its place */
  from: Vec
  group?: Group
}

const shutters: Group = { offset: (x) => [Math.sign(x) * 0.3, 0, 0.12], joins: 13 }
const crown: Group = { offset: () => [0, 0.32, 0.12], joins: 14 }
const posts: Group = { offset: (x) => [Math.sign(x) * 0.42, -0.4, 0.12], joins: 11 }

const front: Vec = [0, 0, 0.35]
const behind: Vec = [0, 0, -0.35]
const above: Vec = [0, 0.25, 0]

export const parts: Part[] = [
  // Front frame with the engraving: on the table from the start
  { bodies: ['b04', 'b05'], appears: 0, from: [0, 0, 0] },
  // 01 Shelf under the window
  { bodies: ['b24'], appears: 1, from: front },
  { bodies: ['b23'], appears: 1, from: [0, 0, 0.5] },
  // 02 Posts, glued in pairs, wait aside
  { bodies: ['b26', 'b27'], appears: 2, from: [0, 0.2, 0], group: posts },
  // 03 Toothed strip over the window
  { bodies: ['b22'], appears: 3, from: front },
  // 05 Ornament over the window
  { bodies: ['b21'], appears: 5, from: front },
  { bodies: ['b19', 'b20'], appears: 5, from: [0, 0, 0.45] },
  // 06 Shutters: base and frame with three windows
  { bodies: ['b15', 'b16'], appears: 6, from: [0, 0.2, 0], group: shutters },
  { bodies: ['b17', 'b18'], appears: 6, from: [0, 0, 0.3], group: shutters },
  // 07–08 Base of the crown
  { bodies: ['b07'], appears: 7, from: above, group: crown },
  // 09 Valances: the long one and the corners
  { bodies: ['b08'], appears: 9, from: [0, -0.15, 0.2], group: crown },
  { bodies: ['b09', 'b10', 'b11', 'b12', 'b13', 'b14'], appears: 9, from: [0, -0.15, 0.3], group: crown },
  // 10 Crest
  { bodies: ['b25'], appears: 10, from: above, group: crown },
  // 12 Middle and back layers of the frame
  { bodies: ['b02', 'b03'], appears: 12, from: behind },
  { bodies: ['b00', 'b01'], appears: 12, from: [0, 0, -0.55] },
  // 15 Mirror
  { bodies: ['b28'], appears: 15, from: behind },
  // 16 Back cover
  { bodies: ['b06'], appears: 16, from: behind },
]

export type View = 'front' | 'back'

/** What the camera shows: the whole nalichnik or the crown put together above it */
export type Focus = 'all' | 'crown'

export type Step = {
  number: number
  title: string
  text: string
  view?: View
  focus?: Focus
}

/** Step 0 is the start: the front frame alone */
export const steps: Step[] = [
  {
    number: 0,
    title: 'Лицевая рама',
    text: 'С неё начинается сборка: на эту раму слой за слоем ложатся все детали лицевой стороны.',
  },
  {
    number: 1,
    title: 'Соберите полочку под окном',
    text: 'Две длинные детали с выступами склеиваются ступенькой и встают в прорези над нижним резным краем рамы.',
  },
  {
    number: 2,
    title: 'Склейте опоры',
    text: 'Четыре фигурные детали склеиваются попарно в две опоры потолще. Пусть сохнут: они понадобятся в шаге 11.',
  },
  {
    number: 3,
    title: 'Приклейте зубчатую планку',
    text: 'Тонкая планка встаёт зубцами вверх по верхней границе оконного проёма.',
  },
  {
    number: 4,
    title: 'Приклейте накладки под петли',
    text: 'Четыре маленькие накладки клеятся на боковые стойки по меткам: к ним потом прикрутятся петли ставен.',
  },
  {
    number: 5,
    title: 'Выложите орнамент над окном',
    text: 'Квадратная рамка в центре и два завитка по сторонам ложатся точно по гравировке.',
  },
  {
    number: 6,
    title: 'Склейте ставни',
    text: 'Каждая ставня — сплошная основа и рамка с тремя окошками поверх неё.',
  },
  {
    number: 7,
    title: 'Примерьте слои навершия',
    focus: 'crown',
    text: 'Основы навершия складываются без клея: слои должны лечь ступенькой, а пазы совпасть.',
  },
  {
    number: 8,
    title: 'Склейте основу навершия',
    focus: 'crown',
    text: 'Слои склеиваются только там, где касаются друг друга, чтобы не залить пазы.',
  },
  {
    number: 9,
    title: 'Вставьте подзоры',
    focus: 'crown',
    text: 'Длинный ажурный подзор встаёт в пазы по центру, угловые элементы — поперёк основы по бокам.',
  },
  {
    number: 10,
    title: 'Поставьте гребень',
    focus: 'crown',
    text: 'Самая верхняя резная деталь входит выступами в прорези с задней стороны навершия.',
  },
  {
    number: 11,
    title: 'Приклейте опоры к раме',
    text: 'Опоры из шага 02 встают по краям верхней части рамы, по сторонам от орнамента.',
  },
  {
    number: 12,
    title: 'Склейте раму из трёх слоёв',
    text: 'За лицевой рамой встают средняя и задняя. Края, нижняя резьба и выступы сверху должны совпасть.',
    view: 'back',
  },
  {
    number: 13,
    title: 'Повесьте ставни',
    text: 'Ставни прикручиваются петлями к накладкам на боковых стойках, по две петли на ставню.',
  },
  {
    number: 14,
    title: 'Установите навершие',
    text: 'Навершие садится на выступы в верхней части рамы подзорами вперёд.',
  },
  {
    number: 15,
    title: 'Вставьте зеркало',
    text: 'Раму переворачивают, и зеркало ложится в углубление с обратной стороны, отражающей стороной к окну.',
    view: 'back',
  },
  {
    number: 16,
    title: 'Закройте заднюю крышку',
    text: 'Крышка прикручивается шурупами и прижимает зеркало. Надпись с названием модели — снаружи.',
    view: 'back',
  },
  {
    number: 17,
    title: 'Наличник готов',
    text: 'Откройте ставни и посмотрите на наличник целиком.',
  },
]

export const lastStep = steps.length - 1
