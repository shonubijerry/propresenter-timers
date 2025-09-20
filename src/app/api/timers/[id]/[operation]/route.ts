export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string; operation: string }> }
) {
  const { id, operation } = await params

  return fetch(
    `${process.env.NEXT_PUBLIC_PROPRESENTER_BASE_URL}/v1/timer/${id}/${operation}`
  )
}

export async function PUT(
  _: Request,
  { params }: { params: Promise<{ id: string; operation: string }> }
) {
  const { id, operation } = await params

  return fetch(
    `${process.env.NEXT_PUBLIC_PROPRESENTER_BASE_URL}/v1/timer/${id}/${operation}`,
    {
      method: 'PUT',
    }
  )
}
