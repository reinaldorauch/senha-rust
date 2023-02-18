use rocket::http::Status;
use rocket::response::stream::{Event, EventStream};
use rocket::serde::json::Json;
use rocket::serde::{Deserialize, Serialize};
use rocket::tokio::select;
use rocket::tokio::sync::{
    broadcast::{channel, error::RecvError, Sender},
    Mutex,
};
use rocket::{Shutdown, State};
use std::borrow::Cow;
use std::collections::HashMap;
use std::default::Default;
use std::sync::Arc;
use uuid::Uuid;

#[macro_use]
extern crate rocket;

#[derive(Default, Debug, Serialize, Clone)]
struct SessionState {
    name: String,
    count: u32,
}

impl SessionState {
    fn new(name: String) -> SessionState {
        SessionState { name, count: 0 }
    }
}

type SessionMap = HashMap<Uuid, SessionState>;

#[derive(Default, Debug)]
struct Session {
    sessions: Arc<Mutex<SessionMap>>,
}

#[derive(Serialize)]
struct NewSessionResponse {
    id: String,
}

#[derive(Serialize)]
struct SessionResponse {
    session: SessionState,
}

#[get("/")]
fn index() -> &'static str {
    "Hello world"
}

#[derive(Serialize)]
struct ListSessionsResponse {
    sessions: SessionMap,
}

#[get("/session")]
async fn list_sessions<'a>(s: &State<Session>) -> Json<ListSessionsResponse> {
    let sessions = s.sessions.lock().await.to_owned();

    Json(ListSessionsResponse { sessions })
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
struct CreateSessionData<'s> {
    name: Cow<'s, str>,
}

#[post("/session", format = "json", data = "<data>")]
async fn create_session(
    session: &State<Session>,
    data: Json<CreateSessionData<'_>>,
) -> Json<NewSessionResponse> {
    let mut sessions = session.sessions.lock().await;
    let id = Uuid::new_v4();
    let name = data.name.to_string();

    sessions.insert(id, SessionState::new(name));

    Json(NewSessionResponse { id: id.to_string() })
}

#[get("/session/<id>")]
async fn get_session<'s>(session: &State<Session>, id: Uuid) -> Option<Json<SessionResponse>> {
    let sessions = session.sessions.lock().await;
    let session = sessions.get(&id)?.to_owned();

    Some(Json(SessionResponse { session }))
}

#[derive(Debug, Clone, FromForm, Serialize, Deserialize)]
struct SessionEvent {
    id: Uuid,
    update: u32,
}

impl SessionEvent {
    fn from_update(e: UpdateSessionEvent, id: Uuid) -> Self {
        SessionEvent {
            id,
            update: e.update,
        }
    }
}

#[get("/session/<id>/stream")]
async fn get_session_stream(
    events: &State<Sender<SessionEvent>>,
    sessions: &State<Session>,
    id: Uuid,
    mut end: Shutdown,
) -> Option<EventStream![]> {
    // Checking to see if session exists
    let sessions = sessions.sessions.lock().await;

    sessions.get(&id)?;

    // dropping the handle to release lock as this will keep running "forever"
    drop(sessions);

    let mut rx = events.subscribe();

    Some(EventStream! {
        loop {
            let msg = select! {
                msg = rx.recv() => match msg {
                    Ok(msg) if msg.id == id => msg,
                    Err(RecvError::Closed) => break,
                    Err(RecvError::Lagged(_)) => continue,
                    _ => continue,
                },
                _ = &mut end => break,
            };

            yield Event::json(&msg).event("update");
        }
    })
}

#[derive(Deserialize)]
struct UpdateSessionEvent {
    update: u32,
}

#[post("/session/<id>/update", format = "json", data = "<data>")]
async fn update_session(
    events: &State<Sender<SessionEvent>>,
    sessions: &State<Session>,
    id: Uuid,
    data: Json<UpdateSessionEvent>,
) -> Option<Status> {
    sessions.sessions.lock().await.get(&id)?;

    events
        .send(SessionEvent::from_update(data.into_inner(), id))
        .unwrap();

    Some(Status::Created)
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .manage(Session::default())
        .manage(channel::<SessionEvent>(1024).0)
        .mount(
            "/",
            routes![
                index,
                create_session,
                get_session,
                list_sessions,
                get_session_stream,
                update_session
            ],
        )
}
