import { AutoComplete, Input } from "antd";
import { ReactNode, useState } from "react";

interface MemorableInputProps {
  onChange: (value: string) => void;
  label?: ReactNode;
  placeholder?: string;
}

const MemorableInput = (props: MemorableInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [inputOptions, setInputOptions] = useState<{ value: string }[]>([]);

  return (
    <AutoComplete
      options={inputOptions}
      onChange={(value: string) => {
        setInputValue(value);
        props.onChange(value);
      }}
      style={{ width: "100%" }}
      allowClear
      children={
        <Input
          addonBefore={props.label}
          placeholder={props.placeholder}
          style={{ width: "100%" }}
          value={inputValue}
        />
      }
      onBlur={() => {
        if (inputValue.trim() !== "") {
          // 防抖，避免移开鼠标时闪烁
          setTimeout(() => {
            setInputOptions((prev) => {
              if (prev.find((item) => item.value === inputValue)) {
                return prev;
              }
              return [...prev, { value: inputValue }];
            });
          }, 300);
        }
      }}
    />
  );
};

export default MemorableInput;
