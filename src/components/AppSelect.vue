<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  modelValue: {
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: '请选择'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootRef = ref(null)

const selectedOption = computed(
  () => props.options.find((option) => option.value === props.modelValue) ?? null
)

function toggleMenu() {
  if (props.disabled) {
    return
  }

  open.value = !open.value
}

function selectOption(option) {
  if (props.disabled) {
    return
  }

  emit('update:modelValue', option.value)
  open.value = false
}

function handleDocumentPointerDown(event) {
  if (rootRef.value && !rootRef.value.contains(event.target)) {
    open.value = false
  }
}

function handleWindowKeydown(event) {
  if (event.key === 'Escape') {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  window.removeEventListener('keydown', handleWindowKeydown)
})
</script>

<template>
  <div ref="rootRef" class="app-select" :class="{ open, disabled }">
    <button
      type="button"
      class="app-select-trigger"
      :disabled="disabled"
      @click="toggleMenu"
    >
      <span class="app-select-value" :class="{ placeholder: !selectedOption }">
        {{ selectedOption?.label ?? placeholder }}
      </span>
      <span class="app-select-arrow"></span>
    </button>

    <div v-if="open" class="app-select-menu">
      <button
        v-for="(option, index) in options"
        :key="`${index}-${option.label}`"
        type="button"
        class="app-select-option"
        :class="{ selected: option.value === modelValue }"
        @click="selectOption(option)"
      >
        <span class="app-select-option-label">{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
  width: 100%;
  min-width: 0;
}

.app-select.open {
  z-index: 240;
}

.app-select-trigger {
  width: 100%;
  min-height: calc(48px * var(--ui-scale));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12px * var(--ui-scale));
  padding: calc(11px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: calc(16px * var(--ui-scale));
  background:
    linear-gradient(180deg, rgba(19, 32, 58, 0.92), rgba(8, 16, 29, 0.88)),
    rgba(15, 23, 42, 0.74);
  color: var(--text-main);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.app-select-trigger:hover {
  border-color: rgba(34, 211, 238, 0.26);
  transform: translateY(-1px);
}

.app-select.open .app-select-trigger,
.app-select-trigger:focus-visible {
  outline: none;
  border-color: rgba(34, 211, 238, 0.34);
  box-shadow:
    0 0 0 calc(3px * var(--ui-scale)) rgba(34, 211, 238, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.app-select.disabled .app-select-trigger {
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
}

.app-select-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  color: inherit;
  font-weight: 600;
}

.app-select-value.placeholder {
  color: var(--text-muted);
}

.app-select-arrow {
  width: calc(10px * var(--ui-scale));
  height: calc(10px * var(--ui-scale));
  flex-shrink: 0;
  border-right: 2px solid #94a3b8;
  border-bottom: 2px solid #94a3b8;
  transform: rotate(45deg) translateY(-1px);
  transition: transform 0.18s ease;
}

.app-select.open .app-select-arrow {
  transform: rotate(-135deg) translateY(-1px);
}

.app-select-menu {
  position: absolute;
  top: calc(100% + calc(10px * var(--ui-scale)));
  left: 0;
  width: 100%;
  max-height: 260px;
  overflow: auto;
  padding: calc(8px * var(--ui-scale));
  border-radius: calc(18px * var(--ui-scale));
  border: 1px solid rgba(34, 211, 238, 0.18);
  background:
    radial-gradient(circle at top right, rgba(34, 211, 238, 0.12), transparent 32%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.82));
  box-shadow:
    0 18px 36px rgba(27, 37, 54, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(18px) saturate(145%);
  z-index: 40;
}

.app-select-option {
  width: 100%;
  display: flex;
  align-items: center;
  padding: calc(12px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: calc(14px * var(--ui-scale));
  background: rgba(2, 6, 23, 0.36);
  color: var(--text-main);
  text-align: left;
  font-size: calc(14px * var(--ui-scale));
  font-weight: 600;
  line-height: 1.5;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease,
    color 0.18s ease;
}

.app-select-option + .app-select-option {
  margin-top: calc(6px * var(--ui-scale));
}

.app-select-option:hover {
  border-color: rgba(34, 211, 238, 0.16);
  background: rgba(15, 23, 42, 0.62);
  box-shadow: 0 10px 20px rgba(29, 35, 52, 0.16);
  transform: translateX(2px);
}

.app-select-option.selected {
  border-color: rgba(34, 211, 238, 0.2);
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(122, 221, 193, 0.12));
  color: #e6faff;
  box-shadow: 0 12px 24px rgba(29, 35, 52, 0.18);
}

.app-select-option-label {
  display: block;
  width: 100%;
  color: inherit;
}

:global(html[data-theme='light']) .app-select-trigger {
  border-color: rgba(27, 37, 54, 0.1);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 249, 253, 0.9)),
    rgba(255, 255, 255, 0.84);
  color: #1b2536;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

:global(html[data-theme='light']) .app-select-trigger:hover {
  border-color: rgba(237, 124, 71, 0.24);
}

:global(html[data-theme='light']) .app-select.open .app-select-trigger,
:global(html[data-theme='light']) .app-select-trigger:focus-visible {
  border-color: rgba(237, 124, 71, 0.36);
  box-shadow:
    0 0 0 calc(3px * var(--ui-scale)) rgba(237, 124, 71, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

:global(html[data-theme='light']) .app-select-value.placeholder {
  color: #677287;
}

:global(html[data-theme='light']) .app-select-arrow {
  border-right-color: #677287;
  border-bottom-color: #677287;
}

:global(html[data-theme='light']) .app-select-menu {
  border-color: rgba(27, 37, 54, 0.1);
  background:
    radial-gradient(circle at top right, rgba(255, 216, 188, 0.2), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.92));
  box-shadow:
    0 18px 36px rgba(27, 37, 54, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

:global(html[data-theme='light']) .app-select-option {
  border-color: rgba(27, 37, 54, 0.06);
  background: #ffffff;
  color: #1b2536;
}

:global(html[data-theme='light']) .app-select-option:hover {
  border-color: rgba(27, 37, 54, 0.12);
  background: rgba(246, 248, 252, 1);
  box-shadow: 0 10px 20px rgba(29, 35, 52, 0.08);
}

:global(html[data-theme='light']) .app-select-option.selected {
  border-color: rgba(237, 124, 71, 0.18);
  background: linear-gradient(135deg, rgba(255, 243, 234, 0.94), rgba(241, 248, 246, 0.92));
  color: #1b2536;
  box-shadow: 0 12px 24px rgba(29, 35, 52, 0.1);
}
</style>
