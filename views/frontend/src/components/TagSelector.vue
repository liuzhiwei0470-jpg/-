<template>
  <div class="tag-selector">
    <div class="tag-list">
      <button
        v-for="tag in tags"
        :key="tag.id"
        :class="['tag-btn', { selected: selected.includes(tag.id) }]"
        @click="toggle(tag.id)"
        type="button"
      >
        <span class="tag-icon">{{ tag.icon }}</span>
        <span class="tag-name">{{ tag.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { PRESET_TAGS, type Tag } from '@/types/subscription';

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const tags = PRESET_TAGS;

const selected = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

function toggle(tagId: string) {
  const current = [...selected.value];
  const index = current.indexOf(tagId);
  if (index > -1) {
    current.splice(index, 1);
  } else {
    current.push(tagId);
  }
  selected.value = current;
}
</script>

<style scoped>
.tag-selector {
  margin-bottom: var(--space-md);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.tag-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-white);
  cursor: pointer;
  font-size: 13px;
  transition: all var(--transition-fast);
  color: var(--color-text-primary);
}

.tag-btn:hover {
  border-color: var(--color-primary);
}

.tag-btn.selected {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tag-icon {
  font-size: 14px;
}

.tag-name {
  font-weight: 500;
}
</style>
