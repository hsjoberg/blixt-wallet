import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface IBarcodeMaskProps {
  width?: number | string;
  height?: number | string;
  edgeWidth?: number | string;
  edgeHeight?: number | string;
  edgeColor?: string;
  edgeBorderWidth?: number | string;
  showAnimatedLine?: boolean;
  animatedLineColor?: string;
  animatedLineHeight?: number | string;
  lineAnimationDuration?: number | string;
  darken?: boolean;
};

class BarcodeMask extends React.Component<IBarcodeMaskProps> {
  constructor(props: any) {
    super(props);
    this.state = {
      top: new Animated.Value(10),
      maskCenterViewHeight: 0,
    };
  }

  _onMaskCenterViewLayoutUpdated = ({ nativeEvent }: any) => {
    this.setState({
      maskCenterViewHeight: nativeEvent.layout.height,
    });
  };

  _applyMaskFrameStyle = () => {
    return {
      backgroundColor: this.props.darken ?? true ? "rgba(0, 0, 0, 0.6)" : "transparent",
      flex: 1,
    };
  };

  _renderEdge = (edgePosition: any) => {
    const defaultStyle = {
      width: this.props.edgeWidth,
      height: this.props.edgeHeight,
      borderColor: this.props.edgeColor,
    };
    const edgeBorderStyle = {
      topRight: {
        borderRightWidth: this.props.edgeBorderWidth,
        borderTopWidth: this.props.edgeBorderWidth,
      },
      topLeft: {
        borderLeftWidth: this.props.edgeBorderWidth,
        borderTopWidth: this.props.edgeBorderWidth,
      },
      bottomRight: {
        borderRightWidth: this.props.edgeBorderWidth,
        borderBottomWidth: (this as any).props.edgeBorderWidth,
      },
      bottomLeft: {
        borderLeftWidth: this.props.edgeBorderWidth,
        borderBottomWidth: this.props.edgeBorderWidth,
      },
    };
    return <View style={[defaultStyle, (styles as any)[edgePosition + 'Edge'], (edgeBorderStyle as any)[edgePosition]]} />;
  };

  render() {
    return (
      <View style={[styles.container]}>
        <View
          style={[
            styles.finder,
            {
              width: this.props.width,
              height: this.props.height,
            },
          ]}
        >
          {this._renderEdge('topLeft')}
          {this._renderEdge('topRight')}
          {this._renderEdge('bottomLeft')}
          {this._renderEdge('bottomRight')}
        </View>

        <View style={styles.maskOuter}>
          <View style={[styles.maskRow, this._applyMaskFrameStyle()]} />
          <View
            style={[{ height: this.props.height, width: "100%" }, styles.maskCenter]}
            onLayout={this._onMaskCenterViewLayoutUpdated}
          >
            <View style={[this._applyMaskFrameStyle()]} />
            <View
              style={[
                styles.maskInner,
                {
                  width: this.props.width,
                  height: this.props.height,
                },
              ]}
            />
            <View style={[this._applyMaskFrameStyle()]} />
          </View>
          <View style={[styles.maskRow, this._applyMaskFrameStyle()]} />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    ...StyleSheet.absoluteFillObject,
  },
  finder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLeftEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  topRightEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  bottomLeftEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  bottomRightEdge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  maskOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  maskInner: {
    backgroundColor: 'transparent',
  },
  maskRow: {
    width: '100%',
  },
  maskCenter: {
    display: 'flex',
    flexDirection: 'row',
  },
  animatedLine: {
    position: 'absolute',
    elevation: 4,
    zIndex: 0,
    width: '85%',
  },
});

const defaultProps = {
  width: 280,
  height: 230,
  edgeWidth: 20,
  edgeHeight: 20,
  edgeColor: '#FFF',
  edgeBorderWidth: 4,
  showAnimatedLine: true,
  animatedLineColor: '#FFF',
  animatedLineHeight: 2,
  lineAnimationDuration: 1500,
  backgroundColor: 'rgba(0, 0, 0, 0.6)'
};

(BarcodeMask as any).defaultProps = defaultProps;

export default BarcodeMask;
