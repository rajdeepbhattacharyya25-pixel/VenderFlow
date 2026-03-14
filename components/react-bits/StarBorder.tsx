import React from 'react';

interface StarBorderProps {
    as?: React.ElementType;
    className?: string;
    innerClassName?: string;
    color?: string;
    speed?: string;
    thickness?: number;
    children: React.ReactNode;
    [key: string]: any;
}

const StarBorder: React.FC<StarBorderProps> = ({
    as: Component = 'button',
    className = '',
    innerClassName = '',
    color = '#ccff00',
    speed = '6s',
    thickness = 1,
    children,
    ...rest
}) => {
    return (
        <>
            <style>
                {`
                .star-border-container {
                  display: block;
                  position: relative;
                  border-radius: inherit;
                  overflow: hidden;
                  box-sizing: border-box;
                }
                .border-gradient-bottom {
                  position: absolute;
                  width: 300%;
                  height: 100%;
                  opacity: 1;
                  bottom: -50%;
                  right: -250%;
                  border-radius: 50%;
                  animation: star-movement-bottom linear infinite alternate;
                  z-index: 0;
                }
                .border-gradient-top {
                  position: absolute;
                  opacity: 1;
                  width: 300%;
                  height: 100%;
                  top: -50%;
                  left: -250%;
                  border-radius: 50%;
                  animation: star-movement-top linear infinite alternate;
                  z-index: 0;
                }
                .star-inner-content {
                  position: relative;
                  z-index: 1;
                  height: 100%;
                  width: 100%;
                  border-radius: inherit;
                }
                @keyframes star-movement-bottom {
                  0% { transform: translate(0%, 0%); opacity: 1; }
                  100% { transform: translate(-100%, 0%); opacity: 0; }
                }
                @keyframes star-movement-top {
                  0% { transform: translate(0%, 0%); opacity: 1; }
                  100% { transform: translate(100%, 0%); opacity: 0; }
                }
                `}
            </style>
            <Component
                className={`star-border-container ${className}`}
                style={{
                    padding: `${thickness}px`,
                    ...rest.style
                }}
                {...rest}
            >
                <div
                    className="border-gradient-bottom"
                    style={{
                        background: `radial-gradient(circle, ${color}, transparent 20%)`,
                        animationDuration: speed
                    }}
                ></div>
                <div
                    className="border-gradient-top"
                    style={{
                        background: `radial-gradient(circle, ${color}, transparent 20%)`,
                        animationDuration: speed
                    }}
                ></div>
                <div className={`star-inner-content ${innerClassName}`}>{children}</div>
            </Component>
        </>
    );
};

export default StarBorder;
