import { Button } from "./controls";

type Props = {
  text: string;
  textButton?: string;
  onClick: () => void;
};

export const Retry: React.FC<Props> = ({
  text,
  textButton = "Retry",
  onClick,
}) => {
  return (
    <div className="mb-3 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-2xl text-red-700">
      <span>{text}</span>
      <Button onClick={onClick}>{textButton}</Button>
    </div>
  );
};
