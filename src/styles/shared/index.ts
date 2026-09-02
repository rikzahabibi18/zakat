import type React from 'react'
import { layout } from './layout'
import { card } from './card'
import { form } from './form'
import { button } from './button'
import { feedback } from './feedback'
import { modal } from './modal'
import { table } from './table'
import { transaksiForm } from './transaksi-form'
import { misc } from './misc'

export const shared: Record<string, React.CSSProperties> = {
  ...layout,
  ...card,
  ...form,
  ...button,
  ...feedback,
  ...modal,
  ...table,
  ...transaksiForm,
  ...misc,
}
