import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeEach(() => {
  // Reset fetch mock per test
  // @ts-ignore
  global.fetch = undefined as any;
});

test('renders title and allows adding to queue', async () => {
  // Keep the processing running so the queue section remains visible
  // @ts-ignore
  global.fetch = jest.fn(() => new Promise(() => {}));

  render(<App />);

  expect(screen.getByText('YouTube書き起こしツール')).toBeInTheDocument();

  const input = screen.getByPlaceholderText('YouTubeのURLを入力');
  const addBtn = screen.getByRole('button', { name: 'キューに追加' });

  await userEvent.type(input, 'https://youtu.be/abc');
  await userEvent.click(addBtn);

  expect(await screen.findByText('キュー待ちURL')).toBeInTheDocument();
  expect(screen.getByText('https://youtu.be/abc')).toBeInTheDocument();
});

test('processes queue successfully and shows result', async () => {
  // Mock fetch: first call convert, second call transcribe
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ filename: 'file.mp3' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'Hello world', transcriptionFile: 'file.txt' }) });
  // @ts-ignore
  global.fetch = fetchMock;

  render(<App />);

  const input = screen.getByPlaceholderText('YouTubeのURLを入力');
  const addBtn = screen.getByRole('button', { name: 'キューに追加' });

  await userEvent.type(input, 'https://youtu.be/ok');
  await userEvent.click(addBtn);

  // processing indicator appears
  expect(await screen.findByText(/処理中/)).toBeInTheDocument();

  // wait for result to appear
  await waitFor(() => {
    expect(screen.getByText('書き起こし結果')).toBeInTheDocument();
  });
  // check download button separately
  expect(screen.getByRole('button', { name: 'テキストをダウンロード' })).toBeInTheDocument();
});

test('shows error on failed convert', async () => {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: '変換エラー' }) });
  // @ts-ignore
  global.fetch = fetchMock;

  render(<App />);

  const input = screen.getByPlaceholderText('YouTubeのURLを入力');
  const addBtn = screen.getByRole('button', { name: 'キューに追加' });

  await userEvent.type(input, 'https://youtu.be/fail');
  await userEvent.click(addBtn);

  expect(await screen.findByText('変換エラー')).toBeInTheDocument();
});

test('opens download when clicking button', async () => {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ filename: 'file.mp3' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'Hello world', transcriptionFile: 'file.txt' }) });
  // @ts-ignore
  global.fetch = fetchMock;

  const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

  render(<App />);

  const input = screen.getByPlaceholderText('YouTubeのURLを入力');
  const addBtn = screen.getByRole('button', { name: 'キューに追加' });

  await userEvent.type(input, 'https://youtu.be/ok');
  await userEvent.click(addBtn);

  const dlBtn = await screen.findByRole('button', { name: 'テキストをダウンロード' });
  await userEvent.click(dlBtn);

  expect(openSpy).toHaveBeenCalledWith('http://localhost:3001/api/download/file.txt');
});

test('shows error on failed transcribe', async () => {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ filename: 'file.mp3' }) })
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: '書き起こしエラー' }) });
  // @ts-ignore
  global.fetch = fetchMock;

  render(<App />);

  const input = screen.getByPlaceholderText('YouTubeのURLを入力');
  const addBtn = screen.getByRole('button', { name: 'キューに追加' });

  await userEvent.type(input, 'https://youtu.be/bad2');
  await userEvent.click(addBtn);

  expect(await screen.findByText('書き起こしエラー')).toBeInTheDocument();
});

test('shows default convert error message when none provided', async () => {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: false, json: async () => ({}) });
  // @ts-ignore
  global.fetch = fetchMock;

  render(<App />);

  const input = screen.getByPlaceholderText('YouTubeのURLを入力');
  const addBtn = screen.getByRole('button', { name: 'キューに追加' });

  await userEvent.type(input, 'https://youtu.be/fallback1');
  await userEvent.click(addBtn);

  expect(await screen.findByText('変換に失敗しました')).toBeInTheDocument();
});

test('shows default transcribe error message when none provided', async () => {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ filename: 'file.mp3' }) })
    .mockResolvedValueOnce({ ok: false, json: async () => ({}) });
  // @ts-ignore
  global.fetch = fetchMock;

  render(<App />);

  const input = screen.getByPlaceholderText('YouTubeのURLを入力');
  const addBtn = screen.getByRole('button', { name: 'キューに追加' });

  await userEvent.type(input, 'https://youtu.be/fallback2');
  await userEvent.click(addBtn);

  expect(await screen.findByText('書き起こしに失敗しました')).toBeInTheDocument();
});
