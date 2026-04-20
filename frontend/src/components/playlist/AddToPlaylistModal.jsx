import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { addVideoToPlaylist, createUserPlaylist, fetchProfilePlaylists } from '../../services/profile.service'
import { getApiErrorMessage } from '../../utils/apiError'

export function AddToPlaylistModal({ isOpen, onClose, videoId }) {
  const { user: currentUser } = useAuth()

  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(false)
  const [addingPlaylistId, setAddingPlaylistId] = useState('')
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('')
  const [creatingAndAdding, setCreatingAndAdding] = useState(false)

  useEffect(() => {
    if (!isOpen || !currentUser?._id) {
      return
    }

    let active = true

    async function loadPlaylists() {
      setLoading(true)

      try {
        const response = await fetchProfilePlaylists({ limit: 50 })
        if (!active) return
        const ownPlaylists = (response.playlists || []).filter(
          (playlist) => String(playlist.owner?._id || playlist.owner) === String(currentUser?._id),
        )
        setPlaylists(ownPlaylists)
      } catch (error) {
        console.error('Failed to fetch playlists:', error)
        if (!active) return
        setPlaylists([])
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPlaylists()

    return () => {
      active = false
    }
  }, [isOpen, currentUser?._id])

  async function handleAddToPlaylist(playlistId) {
    if (!videoId || !playlistId || addingPlaylistId) {
      return
    }

    setAddingPlaylistId(playlistId)

    try {
      const response = await addVideoToPlaylist(playlistId, videoId)
      toast.success(response.message || 'Added to playlist')
      onClose()
    } catch (error) {
      console.error('Failed to add video to playlist:', error)
      toast.error('Could not add video to playlist')
    } finally {
      setAddingPlaylistId('')
    }
  }

  async function handleCreateAndAdd(event) {
    event.preventDefault()

    const name = newPlaylistName.trim()
    const description = newPlaylistDescription.trim()

    if (!videoId || !name || creatingAndAdding || addingPlaylistId) {
      if (!name) {
        toast.error('Playlist name is required')
      }
      return
    }

    setCreatingAndAdding(true)

    try {
      const created = await createUserPlaylist({
        name,
        description,
      })

      const createdPlaylistId = created?.playlist?._id

      if (!createdPlaylistId) {
        throw new Error('Playlist creation failed')
      }

      await addVideoToPlaylist(createdPlaylistId, videoId)
      toast.success('Playlist created and video added')
      onClose()
      setNewPlaylistName('')
      setNewPlaylistDescription('')
    } catch (error) {
      console.error('Failed to create playlist and add video:', error)
      toast.error(getApiErrorMessage(error, 'Could not create playlist and add video'))
    } finally {
      setCreatingAndAdding(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add to Playlist</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(addingPlaylistId) || creatingAndAdding}
            className="rounded-md px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="h-10 animate-pulse rounded-lg bg-slate-200" />
              ))}
            </div>
          ) : null}

          {!loading && playlists.length === 0 ? (
            <div className="space-y-3 rounded-lg border border-dashed border-slate-300 p-4">
              <p className="text-sm text-slate-600">No playlists found</p>

              <form onSubmit={handleCreateAndAdd} className="space-y-2.5">
                <input
                  value={newPlaylistName}
                  onChange={(event) => setNewPlaylistName(event.target.value)}
                  placeholder="Playlist name"
                  disabled={creatingAndAdding}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <textarea
                  value={newPlaylistDescription}
                  onChange={(event) => setNewPlaylistDescription(event.target.value)}
                  placeholder="Description"
                  rows={3}
                  disabled={creatingAndAdding}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={creatingAndAdding || !newPlaylistName.trim()}
                  className="w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingAndAdding ? 'Creating...' : 'Create & Add Video'}
                </button>
              </form>
            </div>
          ) : null}

          {!loading && playlists.length > 0
            ? playlists.map((playlist) => {
                const isAdding = addingPlaylistId === playlist._id

                return (
                  <button
                    key={playlist._id}
                    type="button"
                    onClick={() => handleAddToPlaylist(playlist._id)}
                    disabled={Boolean(addingPlaylistId) || creatingAndAdding}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{playlist.name || 'Untitled playlist'}</p>
                      <p className="text-xs text-slate-500">{playlist.totalVideos ?? 0} videos</p>
                    </div>
                    <span className="text-xs font-medium text-sky-600">{isAdding ? 'Adding...' : 'Select'}</span>
                  </button>
                )
              })
            : null}
        </div>
      </div>
    </div>
  )
}
