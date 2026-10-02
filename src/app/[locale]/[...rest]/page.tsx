import { notFound } from 'next/navigation'

// Catch-all so unknown localised paths render the localised 404 inside the layout.
export default function CatchAll() {
  notFound()
}
