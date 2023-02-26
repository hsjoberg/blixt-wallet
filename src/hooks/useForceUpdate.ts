import { useReducer, useState } from "react";

export default function useForceUpdate() {
  // const [, setValue] = useState(0);
  const [_, forceUpdate] = useReducer((x) => x + 1, 0);
  return forceUpdate;
}
