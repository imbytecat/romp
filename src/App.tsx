import { Allotment } from "allotment";
import "allotment/dist/style.css";
import {
  Button,
  Flex,
  Input,
  List,
  Select,
  Space,
  Tabs,
  TabsProps,
  Tag,
  notification,
} from "antd";
import { Key, SyntheticEvent, useCallback, useEffect, useState } from "react";
import ResizableTable, {
  ResizableTableProps,
} from "./components/ResizableTable/ResizableTable";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { quietlight } from "@uiw/codemirror-theme-quietlight";
import { EditorView } from "@codemirror/view";
import "./App.css";
import {
  BellOutlined,
  DisconnectOutlined,
  LinkOutlined,
  SendOutlined,
} from "@ant-design/icons";
import MemorableInput from "./components/MemorableInput/MemorableInput";
import { Client as StompClient } from "@stomp/stompjs";
import DataEditor from "./components/DataEditor/DataEditor";

let stompClient: StompClient;

enum StompFrame {
  // see: https://stomp.github.io/stomp-specification-1.2.html

  // Connection frames
  Connect = "CONNECT",
  Stomp = "STOMP",
  Connected = "CONNECTED",

  // Client frames
  Send = "SEND",
  Subscribe = "SUBSCRIBE",
  Unsbscribe = "UNSUBSCRIBE",
  Ack = "ACK",
  Nack = "NACK",
  Begin = "BEGIN",
  Commit = "COMMIT",
  Abort = "ABORT",
  Disconnect = "DISCONNECT",

  // Server frames
  Message = "MESSAGE",
  Receipt = "RECEIPT",
  Error = "ERROR",
}

type TagColor = {
  [key in StompFrame]: string;
};

const FrameTagColor: TagColor = {
  // see: https://ant.design/components/tag-cn/#components-tag-demo-colorful

  [StompFrame.Connect]: "processing",
  [StompFrame.Stomp]: "lime",
  [StompFrame.Connected]: "success",
  [StompFrame.Send]: "cyan",
  [StompFrame.Subscribe]: "blue",
  [StompFrame.Unsbscribe]: "gold",
  [StompFrame.Ack]: "green",
  [StompFrame.Nack]: "red",
  [StompFrame.Begin]: "magenta",
  [StompFrame.Commit]: "orange",
  [StompFrame.Abort]: "volcano",
  [StompFrame.Disconnect]: "warning",
  [StompFrame.Message]: "geekblue",
  [StompFrame.Receipt]: "purple",
  [StompFrame.Error]: "error",
};

interface StompDataType {
  key: Key;
  frame: StompFrame;
  destination: string;
  body: string;
}

const columns: ResizableTableProps<StompDataType>["columns"] = [
  {
    title: "Frame",
    dataIndex: "frame",
    render: (frame: StompFrame) => (
      <Tag color={FrameTagColor[frame]}>{frame}</Tag>
    ),
    width: 120,
    resizable: true,
    minWidth: 100,
  },
  {
    title: "Destination",
    dataIndex: "destination",
    render: (text: string) => <code>{text}</code>,
    width: 160,
    resizable: true,
    minWidth: 100,
  },
  {
    title: "Body",
    dataIndex: "body",
    ellipsis: true,
    width: 200,
    resizable: true,
    minWidth: 100,
  },
  {
    // BUG 表格最后一列设置了 resizable 相关属性，会导致表格整个不正常，因此留空一列
    title: undefined,
  },
];

const App = () => {
  const [connected, setConnected] = useState<boolean>(false);
  const [editorValue, setEditorValue] = useState<string>("");
  const [activeRowId, setActiveRowId] = useState<Key>("");
  const [isRawBody, setIsRawBody] = useState<boolean>(false);
  const [sendDestination, setSendDestination] = useState<string>("");
  const [subscriptionDestination, setSubscriptionDestination] =
    useState<string>("");
  const [subscriptions, setSubscriptions] = useState<
    { key: Key; destination: string }[]
  >([]);
  const [url, setUrl] = useState<string>("");
  const [stompData, setStompData] = useState<StompDataType[]>([]);

  useEffect(() => {
    console.log("subscriptions:", subscriptions);
  }, [subscriptions]);

  const handleConnect = () => {
    if (connected) {
      stompClient.deactivate();
      setConnected(false);
      return;
    }
    stompClient = new StompClient({
      brokerURL: url,
    });
    stompClient.onWebSocketError = (event) => {
      stompClient.deactivate();
      setConnected(false);
      notification.error({
        message: "WebSocket error",
        description: event.reason,
      });
    };
    stompClient.onConnect = (frame) => {
      console.log("onConnect", frame);
      setConnected(true);
      notification.success({
        message: "Connected",
        description: Object.entries(frame.headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", "),
      });
    };
    stompClient.onDisconnect = (frame) => {
      console.log("onDisconnect", frame);
      setConnected(false);
      notification.success({
        message: "Disconnected",
        description: Object.entries(frame.headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", "),
      });
    };
    stompClient.activate();
  };

  const handleBodySelectChange = (value: string) => {
    setIsRawBody(value === "raw");
  };

  const onEditorValueChange = useCallback((val: string) => {
    setEditorValue(val);
  }, []);

  const handleRow = (record: StompDataType) => {
    return {
      onClick: (event: SyntheticEvent) => {
        setActiveRowId(record.key);
        event.stopPropagation();
      },
    };
  };

  const setActiveRowClassName = (record: StompDataType) => {
    return record.key === activeRowId ? "active-row" : "";
  };

  const handleFormatJson = () => {
    try {
      const json = JSON.parse(editorValue);
      setEditorValue(JSON.stringify(json, null, 2));
    } catch (error: unknown) {
      if (error instanceof Error) {
        notification.error({
          message: "Format JSON failed",
          description: error.message,
        });
      }
    }
  };

  const tabItems: TabsProps["items"] = [
    {
      key: "send",
      label: "Send",
      children: (
        <Flex vertical style={{ width: "100%", height: "100%" }}>
          {/* 数据目的地 */}
          <Space.Compact style={{ width: "100%" }}>
            <MemorableInput
              label="Destination"
              placeholder="/app/hello"
              onChange={setSendDestination}
            />
            <Button
              type="default"
              onClick={() => {
                stompClient.publish({
                  destination: sendDestination,
                  body: editorValue,
                });
                setStompData((prev) => [
                  ...prev,
                  {
                    key: prev.length,
                    frame: StompFrame.Send,
                    destination: sendDestination,
                    body: editorValue,
                  },
                ]);
              }}
              disabled={!connected || !sendDestination.trim()}
            >
              <SendOutlined />
              Send
            </Button>
          </Space.Compact>

          {/* 功能栏 */}
          <Space align="baseline">
            <Select
              defaultValue={isRawBody ? "raw" : "json"}
              options={[
                { value: "json", label: "JSON" },
                { value: "raw", label: "Raw" },
              ]}
              onChange={handleBodySelectChange}
              style={{ width: 80 }}
            />
            <Button
              type="text"
              onClick={() => {
                setEditorValue("");
                notification.success({
                  message: "Successfully cleared",
                });
              }}
            >
              Clear
            </Button>
          </Space>

          {/* 编辑器 */}
          <div
            style={{
              width: "100%",
              height: "100%",
              overflow: "auto",
            }}
          >
            <CodeMirror
              value={editorValue}
              onChange={onEditorValueChange}
              extensions={[EditorView.lineWrapping].concat(
                isRawBody ? [] : [json()]
              )}
              theme={quietlight}
            />
          </div>

          {/* 编辑器额外功能栏 */}
          {!isRawBody && (
            <Space align="baseline">
              <Button type="text" onClick={handleFormatJson}>
                Format JSON
              </Button>
            </Space>
          )}
        </Flex>
      ),
    },
    {
      key: "subscribe",
      label: "Subscribe",
      children: (
        <Flex vertical style={{ width: "100%", height: "100%" }}>
          <Space.Compact style={{ width: "100%" }}>
            <MemorableInput
              label="Destination"
              placeholder="/topic/greetings"
              onChange={setSubscriptionDestination}
            />
            <Button
              type="default"
              disabled={!connected || !subscriptionDestination.trim()}
              onClick={() => {
                stompClient.subscribe(subscriptionDestination, (message) => {
                  setStompData((prev) => [
                    ...prev,
                    {
                      key: prev.length,
                      frame: StompFrame.Message,
                      destination: message.headers.destination,
                      body: message.body,
                    },
                  ]);
                });
                setSubscriptions((prev) => [
                  ...prev,
                  { key: new Date().getTime(), destination: subscriptionDestination },
                ]);
                setSubscriptionDestination("");
              }}
            >
              <BellOutlined />
              Subscribe
            </Button>
          </Space.Compact>

          <List
            dataSource={subscriptions}
            renderItem={(item) => (
              <List.Item actions={[
                <Button
                  type="link"
                  onClick={() => {
                    stompClient.unsubscribe(item.destination);
                    setSubscriptions((prev) => {
                      const index = prev.findIndex((sub) => sub.key === item.key);
                      if (index !== -1) prev.splice(index, 1);
                      return [...prev];
                    })
                  }}
                >
                  Unsubscribe
                </Button>
              ]}>
                <code>{item.destination}</code>
              </List.Item>
            )}
            style={{ width: "100%", height: "100%", overflow: "auto" }}
          />
        </Flex>
      ),
    },
  ];

  const verifyUrl = (url: string): boolean => {
    const regex =
      /^(ws|wss)?:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(:[0-9]+)?(\/.*)?$/;
    return !regex.test(url);
  };

  return (
    <Allotment>
      {/* 左边的内容 */}
      <Allotment.Pane>
        <Flex vertical style={{ width: "100%", height: "100%" }}>
          {/* 地址栏 */}
          <Space.Compact style={{ width: "100%" }}>
            <Input
              placeholder="ws://localhost:8080/ws"
              onChange={(event) => setUrl(event.target.value)}
            />
            <Button
              type={connected ? "default" : "primary"}
              onClick={handleConnect}
              disabled={verifyUrl(url)}
            >
              {connected ? <DisconnectOutlined /> : <LinkOutlined />}
              {connected ? "Disconnect" : "Connect"}
            </Button>
          </Space.Compact>

          {/* Tab */}
          <Tabs items={tabItems} style={{ width: "100%", height: "100%" }} />
        </Flex>
      </Allotment.Pane>

      <Allotment.Pane>
        {/* 右边的内容，进一步上下分割 */}
        <Allotment vertical>
          {/* 右上方的内容 */}
          <Allotment.Pane>
            <div
              style={{
                width: "100%",
                height: "100%",
                overflow: "auto",
              }}
            >
              <ResizableTable
                dataSource={stompData}
                columns={columns}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onRow={handleRow as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rowClassName={setActiveRowClassName as any}
                pagination={false}
                size="small"
                bordered
              />
            </div>
          </Allotment.Pane>

          {/* 右下方的内容 */}
          <Allotment.Pane>
            {/* <div>
              {stompData.find((item) => item.key === activeRowId)?.body}
            </div> */}
            <DataEditor />
          </Allotment.Pane>
        </Allotment>
      </Allotment.Pane>
    </Allotment>
  );
};

export default App;
