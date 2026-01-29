export default function StubPage() {
  return (
    <div 
      data-testid="stub-page"
      className="min-h-screen bg-white flex items-center justify-center"
    >
      <div className="text-center text-gray-500">
        <p data-testid="stub-message">Offer unavailable</p>
      </div>
    </div>
  );
}
