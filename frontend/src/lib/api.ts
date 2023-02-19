import useSWR from "swr";
import { fetchEventSource } from "@microsoft/fetch-event-source";

const API_BASE_URL = "http://localhost:8000";

const fetcher = (...args: [RequestInfo | URL, RequestInit | undefined]) =>
  fetch(...args).then((res) => res.json());

export interface Board {
  id?: string;
  name: string;
  count: number;
}

interface BoardMap {
  sessions: { [key: string]: { name: string; count: number } };
}

const useBoards = () => {
  const { data, isLoading, error, mutate } = useSWR<BoardMap>(
    API_BASE_URL + "/session"
  );

  return {
    boards:
      data &&
      Object.entries(data.sessions).map(([id, s]) => ({ id, ...s } as Board)),
    isLoading,
    error,
    mutate,
  };
};

export interface SessionResponse {
  session: Board;
}

const useBoard = (boardId?: string) => {
  const { data, isLoading, error } = useSWR<SessionResponse>(
    boardId && API_BASE_URL + "/session/" + boardId
  );

  return {
    board: data && data.session,
    isLoading,
    error,
  };
};

export interface CreateBoardDto {
  name: string;
}

const createBoard = (data: CreateBoardDto) => {
  return fetch(API_BASE_URL + "/session", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const callBoard = (id: string, count: number) => {
  return fetch(API_BASE_URL + "/session/" + id + "/update", {
    method: "POST",
    body: JSON.stringify({ update: count }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export { API_BASE_URL, fetcher, useBoards, useBoard, createBoard, callBoard };
