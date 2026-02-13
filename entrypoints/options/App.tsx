import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  getContentQueryEndpoint,
  getUrlQueryEndpoint,
  saveContentQueryEndpoint,
  saveUrlQueryEndpoint,
} from '@/utils/db';

const App = () => {
  const [urlEndpoint, setUrlEndpoint] = useState('');
  const [contentEndpoint, setContentEndpoint] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    getUrlQueryEndpoint().then(setUrlEndpoint);
    getContentQueryEndpoint().then(setContentEndpoint);
  }, []);

  const saveUrlEndpoint = async () => {
    if (!urlEndpoint.includes('{{url}}')) {
      setStatus('URL endpoint must include {{url}}');
      return;
    }

    await saveUrlQueryEndpoint(urlEndpoint.trim());
    setStatus('URL endpoint saved');
  };

  const saveContentEndpoint = async () => {
    if (!contentEndpoint.includes('{{text}}') && !contentEndpoint.includes('{{string_array}}')) {
      setStatus('Content endpoint must include {{text}} or {{string_array}}');
      return;
    }

    await saveContentQueryEndpoint(contentEndpoint.trim());
    setStatus('Content endpoint saved');
  };

  return (
    <main className='mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-8'>
      <header className='space-y-2'>
        <h1 className='text-2xl font-semibold'>Extendo Settings</h1>
        <p className='text-sm text-muted-foreground'>Configure the endpoints used by popup URL query and text-selection query.</p>
      </header>

      <section className='space-y-3 rounded-lg border bg-card p-4'>
        <label className='text-sm font-medium' htmlFor='url-endpoint'>
          URL-Query Endpoint (GET)
        </label>
        <input
          className='w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring/50 focus-visible:ring-[3px]'
          id='url-endpoint'
          onChange={(event) => setUrlEndpoint(event.target.value)}
          placeholder='https://host.com/entries?url={{url}}'
          type='text'
          value={urlEndpoint}
        />
        <Button onClick={saveUrlEndpoint} type='button'>
          Save URL Endpoint
        </Button>
      </section>

      <section className='space-y-3 rounded-lg border bg-card p-4'>
        <label className='text-sm font-medium' htmlFor='content-endpoint'>
          Content-Query Endpoint (GET)
        </label>
        <input
          className='w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring/50 focus-visible:ring-[3px]'
          id='content-endpoint'
          onChange={(event) => setContentEndpoint(event.target.value)}
          placeholder='https://host.com/entries?text={{text}}&array={{string_array}}'
          type='text'
          value={contentEndpoint}
        />
        <Button onClick={saveContentEndpoint} type='button'>
          Save Content Endpoint
        </Button>
      </section>

      {status ? <p className='text-sm text-muted-foreground'>{status}</p> : null}
    </main>
  );
};

export default App;
