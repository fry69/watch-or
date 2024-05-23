import type { FC, ReactNode } from "react";
import styled from "styled-components";

const ButtonStyle = styled.button`
  background-color: #2979ff;
  border: none;
  color: white;
  padding: 8px 32px 8px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  border-radius: 3px;

  &:hover {
    cursor: pointer;
  }
`;

export const Button: FC<{ children: ReactNode }> = ({
  children,
  ...rest
}: {
  children: ReactNode;
}) => <ButtonStyle {...rest}>{children}</ButtonStyle>;
