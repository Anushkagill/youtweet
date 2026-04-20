import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../common/Button'
import { createUserPlaylist } from '../../services/profile.service'
import { getApiErrorMessage } from '../../utils/apiError'

export function CreatePlaylistModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(event) {
    event.preventDefault()

    if (!name.trim()) {
      toast.error('Playlist name is required')
      return
    }

    setCreating(true)

    try {
      await createUserPlaylist({
        name: name.trim(),
        description: description.trim(),
      })

      toast.success('Playlist created')
      onClose()
      setName('')
      setDescription('')
      if (onSuccess) {
        await onSuccess()
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create playlist.'))
    } finally {
      setCreating(false)
    }
  }

  function handleClose() {
    if (creating) return
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Create Playlist</h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Playlist name"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
