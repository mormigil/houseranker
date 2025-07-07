import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateApiKey } from '@/lib/auth'

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ranked = searchParams.get('ranked')
  const userId = request.headers.get('x-user-id') || 'default'

  let query = supabase
    .from('houses')
    .select('*')
    .eq('user_id', userId)

  if (ranked === 'true') {
    query = query.eq('is_ranked', true).order('rank', { ascending: true })
  } else if (ranked === 'false') {
    query = query.eq('is_ranked', false).order('created_at', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase error in GET /api/houses:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    return NextResponse.json({ 
      error: error.message,
      details: error.details,
      hint: error.hint 
    }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = request.headers.get('x-user-id') || 'default'
  const { title, description, image_url } = await request.json()

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('houses')
    .insert([
      {
        title,
        description,
        image_url,
        user_id: userId,
        is_ranked: false,
      },
    ])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}