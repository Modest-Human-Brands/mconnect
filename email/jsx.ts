import { h } from 'vue'
import type { Component } from 'vue'

export function jsx(type: string | Component, props: Record<string, any> | null, ...children: any[]) {
  const flatChildren = children.flat()
  const slots = flatChildren.length > 0 ? { default: () => flatChildren } : undefined
  return h(type, props, slots)
}

export { Fragment } from 'vue'
