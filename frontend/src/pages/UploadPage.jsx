import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { generateCaption } from '../services/ai.service'
import { uploadVideo } from '../services/video.service'
import { getApiErrorMessage } from '../utils/apiError'

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024
const MAX_THUMBNAIL_SIZE_BYTES = 5 * 1024 * 1024

function formatFileSize(bytes) {
  if (!bytes || bytes < 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

export function UploadPage() {
  const navigate = useNavigate()
  const [videoFile, setVideoFile] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState({})
  const [aiLoading, setAiLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [globalError, setGlobalError] = useState('')

  const videoPreviewUrl = useMemo(() => (videoFile ? URL.createObjectURL(videoFile) : ''), [videoFile])
  const thumbnailPreviewUrl = useMemo(
    () => (thumbnailFile ? URL.createObjectURL(thumbnailFile) : ''),
    [thumbnailFile],
  )

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl)
    }
  }, [thumbnailPreviewUrl, videoPreviewUrl])

  const aiSeedText = useMemo(() => {
    if (description.trim()) return description.trim()
    if (title.trim()) return title.trim()
    if (videoFile?.name) return videoFile.name.replace(/\.[^/.]+$/, '').trim()
    return ''
  }, [description, title, videoFile])

  function handleVideoFileChange(event) {
    const selectedFile = event.target.files?.[0] || null

    if (!selectedFile) {
      setVideoFile(null)
      return
    }

    if (selectedFile.size > MAX_VIDEO_SIZE_BYTES) {
      toast.error('Video must be under 50MB')
      setErrors((prev) => ({ ...prev, videoFile: 'Video must be under 50MB' }))
      event.target.value = ''
      return
    }

    setVideoFile(selectedFile)
    setErrors((prev) => {
      const next = { ...prev }
      delete next.videoFile
      return next
    })
  }

  function handleThumbnailFileChange(event) {
    const selectedFile = event.target.files?.[0] || null

    if (!selectedFile) {
      setThumbnailFile(null)
      return
    }

    if (selectedFile.size > MAX_THUMBNAIL_SIZE_BYTES) {
      toast.error('Thumbnail must be under 5MB')
      setErrors((prev) => ({ ...prev, thumbnailFile: 'Thumbnail must be under 5MB' }))
      event.target.value = ''
      return
    }

    setThumbnailFile(selectedFile)
    setErrors((prev) => {
      const next = { ...prev }
      delete next.thumbnailFile
      return next
    })
  }

  function validateForm() {
    const nextErrors = {}

    if (!videoFile) nextErrors.videoFile = 'Video file is required'
    if (!thumbnailFile) nextErrors.thumbnailFile = 'Thumbnail is required'
    if (!title.trim()) nextErrors.title = 'Title is required'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function onGenerateCaption() {
    if (!aiSeedText) {
      setGlobalError('Add a title, description, or select a video first.')
      toast.error('Add a title, description, or select a video first.')
      return
    }

    setGlobalError('')
    setSuccessMessage('')
    setAiLoading(true)

    try {
      const res = await generateCaption(aiSeedText)

      if (!res?.success) {
        throw new Error(res?.message || 'AI failed')
      }

      setTitle(res.title || '')
      setDescription(res.description || '')
      setAiGenerated(true)
      toast.success('AI content generated')
    } catch (error) {
      const message = getApiErrorMessage(error, 'AI generation failed')
      setGlobalError(message)
      toast.error(message)
    } finally {
      setAiLoading(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()

    if (!validateForm()) return

    setGlobalError('')
    setSuccessMessage('')
    setUploadLoading(true)

    try {
      const res = await uploadVideo({
        videoFile,
        thumbnail: thumbnailFile,
        title: title.trim(),
        description: description.trim(),
      })

      setSuccessMessage(res?.message || 'Video uploaded successfully')
      toast.success(res?.message || 'Video uploaded successfully')

      // reset form
      setVideoFile(null)
      setThumbnailFile(null)
      setTitle('')
      setDescription('')
      setAiGenerated(false)
      setErrors({})

      // optional redirect
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 1200)

    } catch (error) {
      const message = getApiErrorMessage(error, 'Upload failed')
      setGlobalError(message)
      toast.error(message)
    } finally {
      setUploadLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="rounded-3xl border border-slate-200/80 bg-linear-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm"
      >
        <h1 className="text-2xl font-semibold">Upload Video</h1>
        <p className="text-sm text-gray-600">Create a polished upload with smart title and description assistance.</p>
      </motion.div>

      <form onSubmit={onSubmit} className="space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* SECTION 1 */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-semibold text-slate-900">Upload Video</label>
            <input
              id="videoFile"
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
              className="hidden"
            />
            <label
              htmlFor="videoFile"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition duration-200 hover:bg-slate-100"
            >
              <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">VIDEO</span>
              <span>Select Video File</span>
            </label>

            <p className="text-xs text-slate-600">
              {videoFile
                ? `Selected: ${videoFile.name} (${formatFileSize(videoFile.size)})`
                : 'No video selected yet'}
            </p>

            {errors.videoFile ? <p className="text-xs text-rose-600">{errors.videoFile}</p> : null}

            {videoPreviewUrl ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-black">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="max-h-56 w-full bg-black object-contain"
                />
              </div>
            ) : null}
          </div>

          {/* SECTION 2 */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-semibold text-slate-900">Upload Thumbnail</label>
            <input
              id="thumbnailFile"
              type="file"
              accept="image/*"
              onChange={handleThumbnailFileChange}
              className="hidden"
            />
            <label
              htmlFor="thumbnailFile"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition duration-200 hover:bg-slate-100"
            >
              <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">IMAGE</span>
              <span>Select Thumbnail Image</span>
            </label>

            <p className="text-xs text-slate-600">
              {thumbnailFile
                ? `Selected: ${thumbnailFile.name} (${formatFileSize(thumbnailFile.size)})`
                : 'No thumbnail selected yet'}
            </p>

            {errors.thumbnailFile ? <p className="text-xs text-rose-600">{errors.thumbnailFile}</p> : null}

            {thumbnailPreviewUrl ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
                <img
                  src={thumbnailPreviewUrl}
                  className="max-h-56 w-full rounded object-cover"
                  alt="Thumbnail preview"
                />
              </div>
            ) : null}
          </div>

          {/* SECTION 3 */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-semibold text-slate-900">Title</label>
              <button
                type="button"
                onClick={onGenerateCaption}
                disabled={!aiSeedText || aiLoading || uploadLoading}
                className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiGenerated ? 'Regenerate with AI' : 'Generate with AI'}
              </button>
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your video a clear, searchable title"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
            />
            {errors.title ? <p className="text-xs text-rose-600">{errors.title}</p> : null}
          </div>

          {/* SECTION 4 */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-semibold text-slate-900">Description</label>
              <button
                type="button"
                onClick={onGenerateCaption}
                disabled={!aiSeedText || aiLoading || uploadLoading}
                className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiGenerated ? 'Regenerate with AI' : 'Generate with AI'}
              </button>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what viewers will learn or watch"
              rows={6}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
            />
          </div>

          {aiLoading ? <LoadingSpinner label="Generating with AI..." /> : null}

          {globalError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{globalError}</p>
          ) : null}

          {successMessage ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={uploadLoading || !videoFile || !thumbnailFile || !title.trim()}
            className="w-full rounded-xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-sky-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadLoading ? 'Uploading...' : 'Upload Video'}
          </button>
        </motion.div>
      </form>

    </section>
  )
}