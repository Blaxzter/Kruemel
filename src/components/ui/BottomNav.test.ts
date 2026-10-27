import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { i18n } from '@/i18n'
import BottomNav from './BottomNav.vue'

describe('BottomNav', () => {
  it('shows only Heute and Woche; Vielfalt lives behind the Week card', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)', component: { render: () => null } }] })
    await router.push('/woche')
    const wrapper = mount(BottomNav, { global: { plugins: [i18n, router] } })
    const links = wrapper.findAll('a')
    expect(links.map((a) => a.text())).toEqual(['Heute', 'Woche'])
    expect(links.map((a) => a.attributes('href'))).toEqual(['/', '/woche'])
    expect(links[1]!.attributes('aria-current')).toBe('page')
  })
})
