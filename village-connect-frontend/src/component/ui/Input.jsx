import { useState } from "react";
import "./Input.css";

export default function Input({ label, ...props }) {
  const [focus, setFocus] = useState(false);

  return (
    <div className={`input-group ${focus || props.value ? "focused" : ""}`}>
      <input
        {...props}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      />
      <label>{label}</label>
    </div>
  );
}