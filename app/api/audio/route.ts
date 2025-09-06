import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get('filename')
  const bucket = searchParams.get('bucket') // 解説音声用バケット指定


  if (!filename) {
    return NextResponse.json({ error: 'filename is required' }, { status: 400 })
  }

  // 解説音声の場合は異なるS3バケットを使用
  const s3BaseUrl = bucket === 'description'
    ? process.env.NEXT_PUBLIC_S3_DESCRIPTION_BASE_URL
    : process.env.NEXT_PUBLIC_S3_BASE_URL
  const audioPath = bucket === 'description' 
    ? 'audio-files' // 解説音声も同じパス構造
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
    
    
    const response = await fetch(s3Url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'public, max-age=3600'
      }
    })


    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`S3 fetch failed: ${response.status} - ${errorText}`)
    }

    const audioBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'audio/mpeg'


    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Accept-Encoding',
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({ 
      error: 'Failed to fetch audio',
      details: errorMessage,
      filename,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}


