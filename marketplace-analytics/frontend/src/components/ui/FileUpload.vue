<template>
  <div class="w-full">
    <div
      @drop="onDrop"
      @dragover.prevent
      @dragenter.prevent
      @dragleave="onDragLeave"
      :class="dropzoneClasses"
      class="relative border-2 border-dashed rounded-lg p-6 text-center hover:border-primary-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-colors duration-200"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        :multiple="multiple"
        @change="onFileSelect"
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div class="space-y-2">
        <CloudArrowUpIcon class="mx-auto h-12 w-12 text-gray-400" />
        <div class="text-sm text-gray-600">
          <span class="font-medium text-primary-600 hover:text-primary-500">Нажмите для выбора</span>
          или перетащите файлы сюда
        </div>
        <p class="text-xs text-gray-500">{{ acceptText }}</p>
      </div>
    </div>
    
    <!-- Selected files -->
    <div v-if="selectedFiles.length > 0" class="mt-4 space-y-2">
      <h4 class="text-sm font-medium text-gray-900">Выбранные файлы:</h4>
      <div class="space-y-1">
        <div
          v-for="(file, index) in selectedFiles"
          :key="index"
          class="flex items-center justify-between p-2 bg-gray-50 rounded-md"
        >
          <div class="flex items-center space-x-2">
            <DocumentIcon class="h-5 w-5 text-gray-400" />
            <span class="text-sm text-gray-900">{{ file.name }}</span>
            <span class="text-xs text-gray-500">({{ formatFileSize(file.size) }})</span>
          </div>
          <button
            @click="removeFile(index)"
            class="text-gray-400 hover:text-red-500 transition-colors"
          >
            <XMarkIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
    
    <!-- Error message -->
    <div v-if="error" class="mt-2 text-sm text-red-600">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from '@heroicons/vue/24/outline'

interface Props {
  accept?: string
  multiple?: boolean
  maxSize?: number // in bytes
  maxFiles?: number
}

const props = withDefaults(defineProps<Props>(), {
  accept: '.xlsx,.xls,.csv',
  multiple: false,
  maxSize: 52428800, // 50MB
  maxFiles: 1,
})

const emit = defineEmits<{
  filesSelected: [files: File[]]
  error: [message: string]
}>()

const fileInput = ref<HTMLInputElement>()
const selectedFiles = ref<File[]>([])
const isDragOver = ref(false)
const error = ref('')

const acceptText = computed(() => {
  const extensions = props.accept.split(',').map(ext => ext.trim().toUpperCase())
  return `Поддерживаемые форматы: ${extensions.join(', ')} (макс. ${formatFileSize(props.maxSize)})`
})

const dropzoneClasses = computed(() => [
  isDragOver.value ? 'border-primary-400 bg-primary-50' : 'border-gray-300',
  error.value ? 'border-red-300' : '',
])

const onDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  
  const files = Array.from(e.dataTransfer?.files || [])
  handleFiles(files)
}

const onDragLeave = () => {
  isDragOver.value = false
}

const onFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  handleFiles(files)
}

const handleFiles = (files: File[]) => {
  error.value = ''
  
  // Validate file count
  if (!props.multiple && files.length > 1) {
    error.value = 'Можно выбрать только один файл'
    return
  }
  
  if (files.length > props.maxFiles) {
    error.value = `Можно выбрать не более ${props.maxFiles} файл(ов)`
    return
  }
  
  // Validate each file
  const validFiles: File[] = []
  
  for (const file of files) {
    // Check file size
    if (file.size > props.maxSize) {
      error.value = `Файл "${file.name}" слишком большой. Максимальный размер: ${formatFileSize(props.maxSize)}`
      continue
    }
    
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = props.accept.split(',').map(ext => ext.trim().toLowerCase())
    
    if (!allowedExtensions.includes(fileExtension)) {
      error.value = `Файл "${file.name}" имеет неподдерживаемый формат`
      continue
    }
    
    validFiles.push(file)
  }
  
  if (validFiles.length > 0) {
    selectedFiles.value = props.multiple ? [...selectedFiles.value, ...validFiles] : validFiles
    emit('filesSelected', selectedFiles.value)
  }
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
  emit('filesSelected', selectedFiles.value)
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Clear files method (can be called from parent)
const clearFiles = () => {
  selectedFiles.value = []
  error.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

defineExpose({ clearFiles })
</script>