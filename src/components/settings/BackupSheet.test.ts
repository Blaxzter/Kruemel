import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'

const importFile = vi.fn<(f: File) => Promise<void>>()

vi.mock('@/stores', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/stores')>()
  return {
    ...original,
    useBackup: () => ({ exportBlob: async () => new Blob(['{}']), importFile }),
  }
})

const { default: BackupSheet } = await import('./BackupSheet.vue')

enableAutoUnmount(afterEach)
afterEach(() => {
  importFile.mockReset()
})

async function pickFile(file: File): Promise<void> {
  const input = document.body.querySelector<HTMLInputElement>('[data-testid="backup-file"]')!
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  input.dispatchEvent(new Event('change'))
  await flushPromises()
}

describe('BackupSheet import', () => {
  it('asks before importing and then loads the file', async () => {
    importFile.mockResolvedValue()
    const wrapper = mount(BackupSheet, { props: { open: true }, attachTo: document.body, global: { plugins: [i18n] } })
    await flushPromises()

    const file = new File(['{"version":1}'], 'kruemel-backup-2026-10-27.json', { type: 'application/json' })
    await pickFile(file)

    expect(importFile).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('kruemel-backup-2026-10-27.json')
    document.body.querySelector<HTMLButtonElement>('[data-testid="backup-confirm"]')!.click()
    await flushPromises()

    expect(importFile).toHaveBeenCalledWith(file)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('shows a friendly error when the file is not a backup', async () => {
    importFile.mockRejectedValue(new Error('bad file'))
    mount(BackupSheet, { props: { open: true }, attachTo: document.body, global: { plugins: [i18n] } })
    await flushPromises()

    await pickFile(new File(['nope'], 'notes.txt'))
    document.body.querySelector<HTMLButtonElement>('[data-testid="backup-confirm"]')!.click()
    await flushPromises()

    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('konnte nicht geladen werden')
  })

  it('explains a backup from a newer app version', async () => {
    const { BackupError } = await import('@/stores')
    importFile.mockRejectedValue(new BackupError('unsupported-version', 'v2'))
    mount(BackupSheet, { props: { open: true }, attachTo: document.body, global: { plugins: [i18n] } })
    await flushPromises()

    await pickFile(new File(['{"version":2}'], 'kruemel-backup-2030-01-01.json'))
    document.body.querySelector<HTMLButtonElement>('[data-testid="backup-confirm"]')!.click()
    await flushPromises()

    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('neueren Version')
  })
})
