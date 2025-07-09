import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("lobby", "routes/lobby.tsx"),
  route("game", "routes/game.tsx"),
  route("results", "routes/results.tsx"),
  route("join/:gameCode", "routes/join.tsx"),
] satisfies RouteConfig;
