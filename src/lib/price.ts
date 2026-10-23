/** «2 500 ₽», or «Цена по запросу» without a price. Light: used in the browser too */
export function formatPrice(price?: number) {
  return price === undefined
    ? 'Цена по запросу'
    : `${price.toLocaleString('ru-RU')} ₽`
}
