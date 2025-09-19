export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return fetch(
    `${process.env.NEXT_PUBLIC_PROPRESENTER_BASE_URL}/v1/timer/${
      (await params).id
    }`,
    { method: "DELETE", headers: { accept: "*/*" } }
  );
}
