import { render, screen } from '@testing-library/react';
import App from './App';

test('renders editor textarea', () => {
  render(<App />);
  expect(screen.getByText(/Vi-Notes Editor/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Start typing.../i)).toBeInTheDocument();
});
