type Props = {
  text: string;
};

export const Loading: React.FC<Props> = ({ text }) => {
  return (
    <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-800 animate-pulse text-2xl text-center">
      {text}
    </div>
  );
};
