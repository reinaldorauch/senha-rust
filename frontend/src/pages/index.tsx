import Main from "@front/layouts/main";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
} from "@mui/material";
import { createBoard, CreateBoardDto, useBoards } from "@front/lib/api";
import { ChangeEvent, useState } from "react";

const theme = createTheme({
  palette: {
    mode: "dark",
  },
});

export default function Home() {
  const [form, setState] = useState<CreateBoardDto>({ name: "" });
  const { boards, isLoading, error, mutate } = useBoards();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createBoard(form);
    mutate();
  };

  const onFieldChange =
    (fieldName: keyof CreateBoardDto) =>
    (ev: ChangeEvent<HTMLInputElement>) => {
      setState({ ...form, [fieldName]: ev.target.value });
    };

  return (
    <Main>
      <ThemeProvider theme={theme}>
        <Container component="main" maxWidth="xs">
          <CssBaseline />
          <Paper
            sx={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Boards
            </Typography>
            <Box
              component="form"
              onSubmit={handleSubmit}
              noValidate
              sx={{ mt: 1 }}
            >
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Board name"
                name="name"
                autoComplete="name"
                autoFocus
                onChange={onFieldChange("name")}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                Create
              </Button>
            </Box>
          </Paper>

          <Paper
            sx={{
              mt: 8,
              width: "100%",
              maxWidth: 360,
            }}
          >
            <Box>
              <Typography
                textAlign="center"
                sx={{ padding: 2, fontWeight: "bold" }}
              >
                Availabe boards
              </Typography>
            </Box>
            <Box>
              {isLoading && !error && !boards && <>Loading...</>}
              {error && !isLoading && !boards && (
                <>Error when loading boards: {JSON.stringify(error)}</>
              )}
              {boards && (
                <Box>
                  <nav>
                    <List>
                      {boards.map((board, index) => (
                        <ListItem key={index}>
                          <ListItemButton
                            component="a"
                            href={"/board/" + board.id}
                          >
                            <ListItemText>{board.name}</ListItemText>
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </nav>
                </Box>
              )}
            </Box>
          </Paper>
        </Container>
      </ThemeProvider>
    </Main>
  );
}
