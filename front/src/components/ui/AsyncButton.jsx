import { useState } from 'react';

// Botón que muestra un spinner mientras la promesa de onClick resuelve.
// Boton con estado de carga: deshabilita y muestra spinner mientras la promesa vive.
export default function AsyncButton({
  onClick,
  children,
  loadingText,
  className = '',
  disabled = false,
  type = 'button',
  onLoadingChange,
  ...props
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e) => {
    if (!onClick) return;

    if (type !== 'submit') {
      e.preventDefault();
    }

    e.stopPropagation();

    if (disabled || isLoading) return;

    setIsLoading(true);
    onLoadingChange?.(true);

    try {
      await onClick(e);
    } catch (err) {
      console.error('Error en acción del botón:', err);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <button
      {...props}
      type={type}
      onClick={onClick ? handleClick : undefined}
      disabled={disabled || isLoading}
      className={`cursor-pointer inline-flex items-center justify-center gap-1.5 transition-opacity duration-150 ${className} ${
        isLoading ? 'opacity-80 cursor-wait' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading && (
        <span className="spinner-rapido h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
      )}

      <span>{isLoading && loadingText ? loadingText : children}</span>
    </button>
  );
}
