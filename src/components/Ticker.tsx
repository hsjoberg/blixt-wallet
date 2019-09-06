import React, { useState, useEffect } from "react";
import { formatDistanceStrict, fromUnixTime } from "date-fns";

export interface ITickerProps {
  expire: number;
}
export const Ticker = ({ expire }: ITickerProps) => {
  const [display, setDisplay] = useState(formatDistanceStrict(new Date(), fromUnixTime(expire)));

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(
        formatDistanceStrict(new Date(), fromUnixTime(expire))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [expire]);

  return (<>{display}</>);
};

export default Ticker;
