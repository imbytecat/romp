import { AnyObject } from "antd/es/_util/type";
import Table, { ColumnGroupType, ColumnType } from "antd/es/table";
import {
  useState,
  useCallback,
  SyntheticEvent,
  HTMLAttributes,
  ComponentProps,
} from "react";
import { Resizable, ResizeCallbackData } from "react-resizable";
import "./ResizableTable.css";

interface ResizableColumnProps {
  resizable?: boolean;
  minWidth?: number;
}

type ResizableColumnType<DataType> = (
  | ColumnType<DataType>
  | ColumnGroupType<DataType>
) &
  ResizableColumnProps;

export type ResizableTableProps<DataType> = Omit<
  ComponentProps<typeof Table>,
  "columns"
> & {
  columns: ResizableColumnType<DataType>[];
};

const ResizableTitle = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: HTMLAttributes<any> & {
    onResize: (e: SyntheticEvent<Element>, data: ResizeCallbackData) => void;
    width: number;
    minWidth?: number;
  }
) => {
  const { onResize, width, minWidth, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  const minConstraints = minWidth
    ? ([minWidth, -Infinity] as [width: number, height: number])
    : undefined;

  return (
    <Resizable
      width={width}
      height={0}
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
      minConstraints={minConstraints}
    >
      <th {...restProps} />
    </Resizable>
  );
};

const ResizableTable = <DataType extends AnyObject>(
  props: ResizableTableProps<DataType>
) => {
  const { columns, ...restProps } = props;

  const [cols, setCols] = useState(columns);

  const handleResize = useCallback(
    (index: number) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_: SyntheticEvent, { size }: any) => {
        setCols((currentCols) => {
          const nextCols = [...currentCols];
          nextCols[index] = {
            ...nextCols[index],
            width: size.width,
          };
          return nextCols;
        });
      },
    []
  );

  const mergedColumns = cols.map((col, index) => ({
    ...col,
    onHeaderCell: col.resizable
      ? () => ({
          width: col.width,
          onResize: handleResize(index),
          minWidth: col.minWidth,
        })
      : undefined,
  }));

  const components = {
    header: {
      cell: ResizableTitle,
    },
  };

  return (
    <div>
      <Table
        {...restProps}
        components={components}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        columns={mergedColumns as any}
        className="resizable-table"
      />
    </div>
  );
};

export default ResizableTable;
