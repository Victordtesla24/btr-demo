import './ErrorDisplay.css';

interface ErrorDisplayProps {
  message: string;
}

export function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <div className="error-message">
      {message}
    </div>
  );
}

