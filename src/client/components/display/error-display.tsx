import { AlertCircle } from "lucide-react";

const ErorrDisplay = () => {
  return (
    <div className="flex flex-col items-center justify-center size-full">
      <div className="flex-1 size-full flex flex-col items-center justify-center gap-2">
        <div className="flex items-center justify-center size-18 bg-red-500 rounded-full">
          <AlertCircle className="size-10 text-red-100" />
        </div>
        <h1 className="text-2xl font-bold">Some thing went wrong</h1>
        <p className="text-lg text-gray-500">
          Please try again later or contact support.
        </p>
      </div>
    </div>
  );
};

export default ErorrDisplay;
