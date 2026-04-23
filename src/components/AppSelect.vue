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

.app-select-trigger {
  width: 100%;
  min-height: calc(48px * var(--ui-scale));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12px * var(--ui-scale));
  padding: calc(11px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.1);
  border-radius: calc(16px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-main);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.app-select-trigger:hover {
  border-color: rgba(237, 124, 71, 0.28);
  transform: translateY(-1px);
}

.app-select.open .app-select-trigger,
.app-select-trigger:focus-visible {
  outline: none;
  border-color: rgba(237, 124, 71, 0.42);
  box-shadow:
    0 0 0 calc(3px * var(--ui-scale)) rgba(237, 124, 71, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
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
  font-weight: 500;
}

.app-select-value.placeholder {
  color: var(--text-muted);
}

.app-select-arrow {
  width: calc(10px * var(--ui-scale));
  height: calc(10px * var(--ui-scale));
  flex-shrink: 0;
  border-right: 2px solid #677287;
  border-bottom: 2px solid #677287;
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
  border: 1px solid rgba(27, 37, 54, 0.1);
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 18px 36px rgba(27, 37, 54, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
  z-index: 40;
}

.app-select-option {
  width: 100%;
  display: flex;
  align-items: center;
  padding: calc(12px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.04);
  border-radius: calc(14px * var(--ui-scale));
  background: #fff;
  color: var(--text-main);
  text-align: left;
  font-size: calc(14px * var(--ui-scale));
  font-weight: 600;
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
  border-color: rgba(27, 37, 54, 0.12);
  background: rgba(246, 248, 252, 1);
  box-shadow: 0 10px 20px rgba(29, 35, 52, 0.08);
  transform: translateX(2px);
}

.app-select-option.selected {
  border-color: rgba(79, 84, 93, 0.96);
  background: linear-gradient(180deg, rgba(96, 102, 111, 0.98), rgba(74, 79, 88, 0.98));
  color: #fff;
  box-shadow: 0 12px 24px rgba(29, 35, 52, 0.12);
}

.app-select-option-label {
  display: block;
  width: 100%;
}
</style>
