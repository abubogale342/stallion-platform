import { cn } from "@/utils/common";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section";
};

function CardRoot({ children, className, as: Tag = "div" }: CardProps) {
  return <Tag className={className}>{children}</Tag>;
}

function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export default Card;
export { cn as cardCn };
