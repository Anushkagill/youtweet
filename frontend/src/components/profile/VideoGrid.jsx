import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddToPlaylistModal } from '../playlist/AddToPlaylistModal'

export function VideoGrid({ videos = [] }) {
  const navigate = useNavigate()
  const [playlistModalVideoId, setPlaylistModalVideoId] = useState('')

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3 2xl:grid-cols-4">
        {videos.map((video) => (
          <article
            key={video._id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <button type="button" onClick={() => navigate(`/video/${video._id}`)} className="w-full text-left">
              <img
                src={video.thumbnail}
                alt={video.title || 'Video thumbnail'}
                className="aspect-video w-full object-cover"
              />

              <div className="space-y-2 p-3">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{video.title || 'Untitled'}</p>
                <p className="text-xs text-slate-600">Views {video.views ?? 0}</p>
              </div>
            </button>

            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={() => setPlaylistModalVideoId(video._id)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Add to Playlist
              </button>
            </div>
          </article>
        ))}
      </div>

      <AddToPlaylistModal
        isOpen={Boolean(playlistModalVideoId)}
        onClose={() => setPlaylistModalVideoId('')}
        videoId={playlistModalVideoId}
      />
    </>
  )
}
