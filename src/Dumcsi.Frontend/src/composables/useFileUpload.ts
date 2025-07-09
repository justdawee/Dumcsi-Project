import { ref, computed } from 'vue'
import axios from 'axios'

export interface FileUploadOptions {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  multiple?: boolean
}

export interface UploadedFile {
  file: File
  url?: string
  progress: number
  error?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
}

export function useFileUpload(options: FileUploadOptions = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    multiple = false
  } = options

  const files = ref<UploadedFile[]>([])
  const isUploading = ref(false)

  const hasFiles = computed(() => files.value.length > 0)
  const uploadProgress = computed(() => {
    if (files.value.length === 0) return 0
    const total = files.value.reduce((sum, f) => sum + f.progress, 0)
    return Math.round(total / files.value.length)
  })

  function validateFile(file: File): string | null {
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)}`
    }
    
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed`
    }
    
    return null
  }

  function addFiles(fileList: FileList | File[]) {
    const newFiles = Array.from(fileList)
    
    if (!multiple && newFiles.length > 1) {
      throw new Error('Multiple files not allowed')
    }
    
    for (const file of newFiles) {
      const error = validateFile(file)
      
      files.value.push({
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error
      })
    }
  }

  function removeFile(index: number) {
    files.value.splice(index, 1)
  }

  async function uploadFile(uploadedFile: UploadedFile, uploadUrl: string): Promise<void> {
    uploadedFile.status = 'uploading'
    
    const formData = new FormData()
    formData.append('file', uploadedFile.file)
    
    try {
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            uploadedFile.progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          }
        }
      })
      
      uploadedFile.url = response.data.url
      uploadedFile.status = 'success'
      uploadedFile.progress = 100
    } catch (error) {
      uploadedFile.status = 'error'
      uploadedFile.error = error instanceof Error ? error.message : 'Upload failed'
      throw error
    }
  }

  async function uploadAll(uploadUrl: string): Promise<string[]> {
    isUploading.value = true
    const urls: string[] = []
    
    try {
      for (const file of files.value) {
        if (file.status === 'pending') {
          await uploadFile(file, uploadUrl)
          if (file.url) {
            urls.push(file.url)
          }
        }
      }
      return urls
    } finally {
      isUploading.value = false
    }
  }

  function reset() {
    files.value = []
    isUploading.value = false
  }

  return {
    files,
    isUploading,
    hasFiles,
    uploadProgress,
    addFiles,
    removeFile,
    uploadAll,
    reset
  }
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}