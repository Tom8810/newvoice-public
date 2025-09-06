import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get('filename')
  const bucket = searchParams.get('bucket')


  if (!filename) {
    return NextResponse.json({ error: 'filename is required' }, { status: 400 })
  }

  // 解説音声の場合は異なるS3バケットを使用
  const s3BaseUrl = bucket === 'description'
    ? process.env.NEXT_PUBLIC_S3_DESCRIPTION_BASE_URL
    : process.env.NEXT_PUBLIC_S3_BASE_URL
  const audioPath = bucket === 'description' 
    ? 'audio-files'
    : (process.env.NEXT_PUBLIC_S3_AUDIO_PATH || 'audio-files')


  if (!s3BaseUrl) {
    return NextResponse.json({ error: 'S3 configuration missing' }, { status: 500 })
  }

  try {
    const pathSegments = []
    if (audioPath) {
      const cleanPath = audioPath.replace(/^\/|\/$/g, '')
      if (cleanPath) pathSegments.push(cleanPath)
    }
    pathSegments.push(filename)
    
    const s3Url = `${s3BaseUrl.replace(/\/+$/, '')}/${pathSegments.join('/')}`
    
    
    const headResponse = await fetch(s3Url, {
      method: 'HEAD'
    })


    if (!headResponse.ok) {
      throw new Error(`S3 HEAD request failed: ${headResponse.status} - ${headResponse.statusText}`)
    }

    const metadata: Record<string, string> = {}
    const customMetadata: Record<string, string> = {}

    headResponse.headers.forEach((value, key) => {
      if (key.startsWith('x-amz-meta-')) {
        customMetadata[key.replace('x-amz-meta-', '')] = value
      } else if (['content-length', 'content-type', 'last-modified', 'etag'].includes(key)) {
        metadata[key] = value
      }
    })


    // durationの処理
    let duration: string | null = null
    let exactDurationSeconds: number | undefined = undefined
    let durationSource = 'not_available'
    
    if (customMetadata.duration) {
      const exactSeconds = parseFloat(customMetadata.duration)
      if (!isNaN(exactSeconds) && exactSeconds > 0) {
        // 表示用: 切り捨てした整数秒
        const truncatedSeconds = Math.floor(exactSeconds)
        const minutes = Math.floor(truncatedSeconds / 60)
        const remainingSeconds = truncatedSeconds % 60
        duration = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
        exactDurationSeconds = exactSeconds
        durationSource = 'metadata'
      }
    }

    const response = {
      filename,
      url: `/api/audio?filename=${encodeURIComponent(filename)}`,
      duration, // 表示用（切り捨て済み）
      exactDurationSeconds, // シークバー用（正確な値）
      durationSource,
      metadata,
      customMetadata,
    }

    return NextResponse.json(response)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({ 
      error: 'Failed to fetch metadata',
      details: errorMessage,
      filename,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}