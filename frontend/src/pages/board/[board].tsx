import { API_BASE_URL, callBoard, useBoard } from "@front/lib/api";
import { useRouter } from "next/router";
import {
  Grid,
  Fab,
  Box,
  ThemeProvider,
  createTheme,
  Container,
  CssBaseline,
} from "@mui/material";
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";

const theme = createTheme({
  palette: { mode: "dark" },
});

export default function Board() {
  const router = useRouter();
  const { board } = router.query;
  const boardId = board && Array.isArray(board) ? board.join("-") : board;
  const [state, setState] = useState<number | null>(null);
  const { board: boardData, isLoading, error } = useBoard(boardId);

  const call = async () => {
    if (!boardId) return;

    await callBoard(boardId, (state || 0) + 1);
  };

  useEffect(() => {
    const startListening = async () =>
      fetchEventSource(API_BASE_URL + "/session/" + boardId + "/stream", {
        async onopen(res) {
          if (res.ok && res.status === 200) {
            console.log("Connection made ", res);
          } else if (
            res.status >= 400 &&
            res.status < 500 &&
            res.status !== 429
          ) {
            console.log("Client side error ", res);
          }
        },
        onmessage(event) {
          console.log(event.data);
          const parsedData = JSON.parse(event.data);
          setState(parsedData.update);
        },
        onclose() {
          console.log("Connection closed by the server");
        },
        onerror(err) {
          console.log("There was an error from server", err);
        },
      });

    boardId && startListening();
  }, [boardId]);

  console.log("Board data:", boardData);

  return (
    <ThemeProvider theme={theme}>
      <Container component="main">
        <CssBaseline />

        <Box sx={{ height: "100vh" }}>
          <Grid container>
            <Grid>
              <div>
                {isLoading && !boardData && !error && <p>Loading...</p>}
                {error && !isLoading && !boardData && (
                  <p>Error when loading board: {JSON.stringify(error)}</p>
                )}
                {boardData && !isLoading && !error && (
                  <h1>
                    Board: {boardData.name}, current: {state}
                  </h1>
                )}
              </div>
            </Grid>
          </Grid>
          <Fab
            color="primary"
            aria-label="add"
            sx={{ position: "absolute", bottom: 25, left: 25 }}
            href="/"
          >
            <ArrowBackIcon />
          </Fab>
          <Fab
            color="primary"
            aria-label="add"
            sx={{ position: "absolute", bottom: 25, right: 25 }}
            onClick={call}
          >
            <AddIcon />
          </Fab>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
