import { computed } from 'vue'
import { useUiStore } from '../stores/uiStore'
import { getMessages } from '../locales/translations'

export const useLocale = () => {
  const uiStore = useUiStore()
  const messages = computed(() => getMessages(uiStore.language))
  return {
    t: messages,
    language: computed(() => uiStore.language)
  }
}
