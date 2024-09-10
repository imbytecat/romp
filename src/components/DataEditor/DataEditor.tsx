import ReactCodeMirror from "@uiw/react-codemirror";
import { useState } from "react";
import "./DataEditor.css";

const DataEditor = () => {
  const [value, setValue] = useState("");

  return <ReactCodeMirror value={value} onChange={setValue} />;
};

export default DataEditor;
