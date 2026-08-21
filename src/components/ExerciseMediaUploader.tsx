import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { setExerciseMedia, deleteExerciseMedia } from '../db/queries'
import { Button } from './ui'

const MAX_BYTES = 15 * 1024 * 1024 // 15MB — generous for a how-to GIF/clip, keeps IndexedDB usage sane

/** Upload and display a GIF/image/short video demonstrating how to do the exercise, stored locally. */
export function ExerciseMediaUploader({ exerciseId }: { exerciseId: string }) {
  const media = useLiveQuery(() => db.exerciseMedia.get(exerciseId), [exerciseId])
  const inputRef = useRef<HTMLInputElement>(null)
  const [objectUrl, setObjectUrl] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!media) {
      setObjectUrl(undefined)
      return
    }
    const url = URL.createObjectURL(media.blob)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [media])

  async function handleFile(file: File) {
    setError(undefined)
    if (file.size > MAX_BYTES) {
      setError('File is too large (max 15MB) — try a shorter clip or smaller GIF.')
      return
    }
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
    if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
      setError('Please upload an image, GIF, or video file.')
      return
    }
    await setExerciseMedia(exerciseId, file, mediaType, file.name)
  }

  return (
    <div className="flex flex-col gap-2">
      {media && objectUrl && (
        <div className="rounded-xl overflow-hidden bg-black">
          {media.mediaType === 'video' ? (
            <video src={objectUrl} controls className="w-full max-h-80" />
          ) : (
            <img src={objectUrl} alt="How to perform this exercise" className="w-full max-h-80 object-contain" />
          )}
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
        <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
          {media ? 'Replace GIF/photo/video' : '+ Add GIF/photo/video'}
        </Button>
        {media && (
          <Button size="sm" variant="ghost" onClick={() => deleteExerciseMedia(exerciseId)}>
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}
