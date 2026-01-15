"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function IntegrantesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-grow w-full">
        <section className="py-12 sm:py-16 md:py-20 lg:py-28 bg-background">
          <div className="container-safe">
            <div className="mb-12">
              <span className="inline-block px-3 py-1 rounded-full bg-accent-lighter text-accent font-medium text-xs mb-3">
                EQUIPO
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">Nuestro Equipo</h1>
              <p className="text-foreground/60 max-w-2xl text-base sm:text-lg">
                Conoce a los integrantes responsables de la gestión ambiental en el cantón Daule.
              </p>
            </div>

            {/* Contenido será agregado posteriormente */}
            <div className="text-center py-20">
              <p className="text-foreground/50">Contenido en construcción...</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
