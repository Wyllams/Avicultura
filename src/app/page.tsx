import { redirect } from 'next/navigation';

export default function Home() {
  // O middleware fará o catch disto, 
  // mas como fallback explícito caso as rotas sejam carregadas internamente
  redirect('/login');
}
