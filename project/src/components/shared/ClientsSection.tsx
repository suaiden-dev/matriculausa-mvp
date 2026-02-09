// List of photos from the public directory
// position: 'top' (padrão) ou 'center' para fotos que precisam de ajuste
const photos: { src: string; position?: 'top' | 'center' }[] = [
  { src: "/client-1.jpeg" },
  { src: "/client-2.jpeg" },
  { src: "/client-3.jpeg" },
  { src: "/client-4.jpeg" },
  { src: "/client-5.jpeg", position: 'center' },
  { src: "/client-6.jpeg" },
  { src: "/client-8.jpeg" },
  { src: "/client-9.jpeg" },
];

const ClientsSection = () => {
  // Calcula o número de colunas baseado na quantidade de fotos
  const getGridCols = () => {
    const count = photos.length;
    if (count <= 3) return "grid-cols-1 md:grid-cols-3";
    if (count <= 4) return "grid-cols-2 md:grid-cols-4";
    if (count <= 6) return "grid-cols-2 md:grid-cols-3";
    if (count <= 8) return "grid-cols-2 md:grid-cols-4";
    return "grid-cols-2 md:grid-cols-4 lg:grid-cols-5";
  };

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nossos Clientes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Alunos que realizaram o sonho de estudar nos Estados Unidos
          </p>
        </div>

        <div className={`grid ${getGridCols()} gap-3 md:gap-4 max-w-5xl mx-auto`}>
          {photos.map((photo, index) => (
            <div
              key={index}
              className="aspect-square rounded-xl overflow-hidden opacity-0 animate-fade-up hover:scale-105 transition-transform duration-300 shadow-md"
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
            >
              <img
                src={photo.src}
                alt={`Cliente ${index + 1}`}
                className={`w-full h-full object-cover ${photo.position === 'center' ? 'object-center' : 'object-top'}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientsSection;
