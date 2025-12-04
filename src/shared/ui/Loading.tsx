type Props = {
  text?: string;
};

export const Loading: React.FC<Props> = ({ text }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-muted/40 backdrop-blur-sm z-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      {text && <p className="ml-2 text-lg text-white">{text}</p>}
    </div>
  );
};
